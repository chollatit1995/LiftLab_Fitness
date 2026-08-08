import bcrypt from "bcryptjs";
import { SessionPayload } from "../auth";
import { AppUser, AppUserRole } from "../user-types";
import { withDb } from "./client";

function mapUser(row: Record<string, unknown>): AppUser {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as AppUserRole,
    status: row.status as AppUser["status"],
    createdAt: String(row.created_at).slice(0, 10),
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<SessionPayload | null> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT id, email, name, role, password_hash
      FROM app_users
      WHERE email = ${email} AND status = 'active'
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) return null;

    return {
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      role: user.role as string,
    };
  });
}

export async function listUsers(): Promise<AppUser[]> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT id, email, name, role, status, created_at
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
}): Promise<AppUser> {
  const hash = await hashPassword(input.password);

  return withDb(async (sql) => {
    const rows = await sql`
      INSERT INTO app_users (id, email, password_hash, name, role, status)
      VALUES (
        ${input.id},
        ${input.email},
        ${hash},
        ${input.name},
        ${input.role},
        ${input.status ?? "active"}
      )
      RETURNING id, email, name, role, status, created_at
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
  return withDb(async (sql) => {
    const existing = await sql`
      SELECT id FROM app_users WHERE id = ${id} LIMIT 1
    `;
    if (existing.length === 0) return null;

    const current = await sql`
      SELECT email, name, role, status, password_hash
      FROM app_users WHERE id = ${id} LIMIT 1
    `;
    const row = current[0];

    const email = input.email ?? (row.email as string);
    const name = input.name ?? (row.name as string);
    const role = input.role ?? (row.role as AppUserRole);
    const status = input.status ?? (row.status as AppUser["status"]);
    const passwordHash = input.password
      ? await hashPassword(input.password)
      : (row.password_hash as string);

    const rows = await sql`
      UPDATE app_users
      SET email = ${email},
          name = ${name},
          role = ${role},
          status = ${status},
          password_hash = ${passwordHash}
      WHERE id = ${id}
      RETURNING id, email, name, role, status, created_at
    `;
    return mapUser(rows[0]);
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
    await createUser({ ...user, password: defaultPassword });
  }
}

export const userRoleLabels: Record<AppUserRole, { th: string; en: string }> = {
  admin: { th: "ผู้ดูแลระบบ", en: "Admin" },
  manager: { th: "ผู้จัดการ", en: "Manager" },
  staff: { th: "พนักงาน", en: "Staff" },
};
