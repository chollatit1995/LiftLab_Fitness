import { AppUser, AppUserRole } from "../user-types";
import { hashPassword, isHashed, verifyPassword } from "../password";
import { toISODate } from "../dates";
import { withDb } from "./client";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
}

export type LoginResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: "invalid"; remainingAttempts: number | null }
  | { ok: false; reason: "locked"; minutesLeft: number }
  | { ok: false; reason: "ambiguous" };

function mapUser(row: Record<string, unknown>): AppUser {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as AppUserRole,
    status: row.status as AppUser["status"],
    createdAt: toISODate(row.created_at),
    mustChangePassword: Boolean(row.must_change_password),
    lastLoginAt: row.last_login_at ? toISODate(row.last_login_at) : null,
  };
}

function normalizeLogin(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** login ด้วยชื่อ (หลัก) หรืออีเมล (รองรับบัญชีเดิม) */
export async function authenticate(
  login: string,
  password: string
): Promise<LoginResult> {
  return withDb(async (sql) => {
    const normalized = normalizeLogin(login);
    const byEmail = normalized.includes("@");

    const rows = byEmail
      ? await sql`
          SELECT id, email, name, role, password, must_change_password,
                 failed_attempts, locked_until
          FROM app_users
          WHERE LOWER(TRIM(email)) = ${normalized}
            AND status = 'active'
          LIMIT 2
        `
      : await sql`
          SELECT id, email, name, role, password, must_change_password,
                 failed_attempts, locked_until
          FROM app_users
          WHERE LOWER(TRIM(REGEXP_REPLACE(name, '\\s+', ' ', 'g'))) = ${normalized}
            AND status = 'active'
          LIMIT 2
        `;

    if (rows.length === 0) {
      return { ok: false, reason: "invalid", remainingAttempts: null };
    }

    if (rows.length > 1) {
      return { ok: false, reason: "ambiguous" };
    }

    const row = rows[0];
    const lockedUntil = row.locked_until ? new Date(String(row.locked_until)) : null;

    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      const minutesLeft = Math.max(
        1,
        Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
      );
      return { ok: false, reason: "locked", minutesLeft };
    }

    const stored = row.password as string;
    const valid = await verifyPassword(password, stored);

    if (!valid) {
      const attempts = Number(row.failed_attempts ?? 0) + 1;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

      await sql`
        UPDATE app_users
        SET failed_attempts = ${shouldLock ? 0 : attempts},
            locked_until = ${
              shouldLock
                ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString()
                : null
            }
        WHERE id = ${row.id as string}
      `;

      if (shouldLock) {
        return { ok: false, reason: "locked", minutesLeft: LOCK_MINUTES };
      }
      return {
        ok: false,
        reason: "invalid",
        remainingAttempts: MAX_FAILED_ATTEMPTS - attempts,
      };
    }

    // อัปเกรดรหัสผ่านที่ยังเก็บเป็น plain text ให้เป็น hash ตอนที่ยืนยันตัวตนสำเร็จ
    const upgraded = isHashed(stored) ? stored : await hashPassword(password);

    await sql`
      UPDATE app_users
      SET failed_attempts = 0,
          locked_until = NULL,
          last_login_at = NOW(),
          password = ${upgraded}
      WHERE id = ${row.id as string}
    `;

    return {
      ok: true,
      user: {
        id: row.id as string,
        email: row.email as string,
        name: row.name as string,
        role: row.role as string,
        mustChangePassword: Boolean(row.must_change_password),
      },
    };
  });
}

export async function getUserById(id: string): Promise<AppUser | null> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT id, email, name, role, status, created_at,
             must_change_password, last_login_at
      FROM app_users
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows.length > 0 ? mapUser(rows[0]) : null;
  });
}

export async function changeOwnPassword(
  id: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT password FROM app_users WHERE id = ${id} LIMIT 1
    `;
    if (rows.length === 0) return { ok: false, error: "ไม่พบบัญชีผู้ใช้" };

    const stored = rows[0].password as string;
    const valid = await verifyPassword(currentPassword, stored);
    if (!valid) return { ok: false, error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };

    if (await verifyPassword(newPassword, stored)) {
      return { ok: false, error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม" };
    }

    const hashed = await hashPassword(newPassword);
    await sql`
      UPDATE app_users
      SET password = ${hashed}, must_change_password = FALSE
      WHERE id = ${id}
    `;
    return { ok: true };
  });
}

export async function updateOwnProfile(
  id: string,
  name: string
): Promise<AppUser | null> {
  return withDb(async (sql) => {
    const rows = await sql`
      UPDATE app_users
      SET name = ${name}
      WHERE id = ${id}
      RETURNING id, email, name, role, status, created_at,
                must_change_password, last_login_at
    `;
    return rows.length > 0 ? mapUser(rows[0]) : null;
  });
}

export async function listUsers(): Promise<AppUser[]> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT id, email, name, role, status, created_at,
             must_change_password, last_login_at
      FROM app_users
      ORDER BY created_at
    `;
    return rows.map(mapUser);
  });
}

export async function createUser(input: {
  id: string;
  email: string;
  password: string;
  name: string;
  role: AppUserRole;
  status?: AppUser["status"];
  mustChangePassword?: boolean;
}): Promise<AppUser> {
  const hashed = await hashPassword(input.password);
  return withDb(async (sql) => {
    const rows = await sql`
      INSERT INTO app_users (id, email, password, name, role, status, must_change_password)
      VALUES (
        ${input.id},
        ${input.email},
        ${hashed},
        ${input.name},
        ${input.role},
        ${input.status ?? "active"},
        ${input.mustChangePassword ?? true}
      )
      RETURNING id, email, name, role, status, created_at,
                must_change_password, last_login_at
    `;
    return mapUser(rows[0]);
  });
}

export async function updateUser(
  id: string,
  input: {
    email?: string;
    password?: string;
    name?: string;
    role?: AppUserRole;
    status?: AppUser["status"];
  }
): Promise<AppUser | null> {
  const hashed = input.password ? await hashPassword(input.password) : undefined;

  return withDb(async (sql) => {
    const current = await sql`
      SELECT email, name, role, status, password, must_change_password
      FROM app_users WHERE id = ${id} LIMIT 1
    `;
    if (current.length === 0) return null;
    const row = current[0];

    const email = input.email ?? (row.email as string);
    const name = input.name ?? (row.name as string);
    const role = input.role ?? (row.role as AppUserRole);
    const status = input.status ?? (row.status as AppUser["status"]);
    const password = hashed ?? (row.password as string);
    // admin ตั้งรหัสใหม่ให้ = เจ้าของบัญชีต้องเปลี่ยนเองอีกครั้งตอน login
    const mustChange = hashed ? true : Boolean(row.must_change_password);

    const rows = await sql`
      UPDATE app_users
      SET email = ${email},
          name = ${name},
          role = ${role},
          status = ${status},
          password = ${password},
          must_change_password = ${mustChange}
      WHERE id = ${id}
      RETURNING id, email, name, role, status, created_at,
                must_change_password, last_login_at
    `;
    return mapUser(rows[0]);
  });
}

/** สร้างบัญชี login ให้พนักงานจากหน้าจัดการพนักงาน — บังคับเป็น role staff เสมอ */
export async function createStaffAccount(input: {
  staffId: string;
  email: string;
  name: string;
  password: string;
}): Promise<
  { ok: true; user: AppUser } | { ok: false; error: string }
> {
  const hashed = await hashPassword(input.password);

  return withDb(async (sql) => {
    const existing = await sql`
      SELECT id, staff_id FROM app_users
      WHERE email = ${input.email} OR staff_id = ${input.staffId}
      LIMIT 1
    `;
    if (existing.length > 0) {
      return { ok: false, error: "พนักงานคนนี้หรืออีเมลนี้มีบัญชีอยู่แล้ว" };
    }

    const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const rows = await sql`
      INSERT INTO app_users (id, email, password, name, role, status, must_change_password, staff_id)
      VALUES (${id}, ${input.email}, ${hashed}, ${input.name}, 'staff', 'active', TRUE, ${input.staffId})
      RETURNING id, email, name, role, status, created_at,
                must_change_password, last_login_at
    `;
    return { ok: true, user: mapUser(rows[0]) };
  });
}

export async function listStaffAccountIds(): Promise<string[]> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT staff_id FROM app_users WHERE staff_id IS NOT NULL
    `;
    return rows.map((r) => r.staff_id as string);
  });
}

export async function deleteUser(id: string): Promise<boolean> {
  return withDb(async (sql) => {
    const result = await sql`
      DELETE FROM app_users WHERE id = ${id} RETURNING id
    `;
    return result.length > 0;
  });
}

export async function countUsers(): Promise<number> {
  return withDb(async (sql) => {
    const result = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM app_users
    `;
    return result[0]?.count ?? 0;
  });
}

export async function seedDefaultUsers(): Promise<void> {
  const count = await countUsers();
  if (count > 0) return;

  const defaultPassword = "LiftLab@2026";
  const users = [
    {
      id: "u1",
      email: "admin@liftlab.fitness",
      name: "ผู้ดูแลระบบ",
      role: "admin" as AppUserRole,
    },
    {
      id: "u2",
      email: "manager@liftlab.fitness",
      name: "ผู้จัดการ",
      role: "manager" as AppUserRole,
    },
  ];

  for (const user of users) {
    await createUser({
      ...user,
      password: defaultPassword,
      mustChangePassword: true,
    });
  }
}

export const userRoleLabels: Record<AppUserRole, { th: string; en: string }> = {
  admin: { th: "ผู้ดูแลระบบ", en: "Admin" },
  manager: { th: "ผู้จัดการ", en: "Manager" },
  staff: { th: "พนักงาน", en: "Staff" },
};
