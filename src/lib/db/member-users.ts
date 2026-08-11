import { hashPassword, isHashed, verifyPassword } from "../password";
import { MembershipPackage, Promotion } from "../types";
import { toISODate } from "../dates";
import { withDb } from "./client";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export interface MemberAccount {
  memberId: string;
  email: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface AuthenticatedMember {
  memberId: string;
  email: string;
  name: string;
  mustChangePassword: boolean;
}

export type MemberLoginResult =
  | { ok: true; member: AuthenticatedMember }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "locked"; minutesLeft: number }
  | { ok: false; reason: "ambiguous" };

export interface MemberPortalData {
  member: {
    id: string;
    name: string;
    email: string;
    phone: string;
    packageId: string;
    joinedAt: string;
    expiresAt: string;
    status: string;
    sessionsTotal: number | null;
    sessionsUsed: number;
  };
  package: {
    name: string;
    price: number;
    durationDays: number;
    sessionLimit: number | null;
    features: string[];
  } | null;
  bookings: {
    id: string;
    type: string;
    resourceName: string;
    date: string;
    time: string;
    status: string;
  }[];
  /** โปรที่เปิดใช้งานอยู่ ส่วนการกรองตามช่วงวันที่ทำต่อที่ฝั่งหน้าเว็บ */
  promotions: Promotion[];
  packages: MembershipPackage[];
}

function normalizeLogin(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** login ด้วยชื่อสมาชิก (หลัก) หรืออีเมลบัญชี (รองรับของเดิม) */
export async function authenticateMember(
  login: string,
  password: string
): Promise<MemberLoginResult> {
  return withDb(async (sql) => {
    const normalized = normalizeLogin(login);
    const byEmail = normalized.includes("@");

    const rows = byEmail
      ? await sql`
          SELECT mu.member_id, mu.email, mu.password, mu.must_change_password,
                 mu.failed_attempts, mu.locked_until, m.name
          FROM member_users mu
          JOIN members m ON m.id = mu.member_id
          WHERE LOWER(TRIM(mu.email)) = ${normalized}
          LIMIT 2
        `
      : await sql`
          SELECT mu.member_id, mu.email, mu.password, mu.must_change_password,
                 mu.failed_attempts, mu.locked_until, m.name
          FROM member_users mu
          JOIN members m ON m.id = mu.member_id
          WHERE LOWER(TRIM(REGEXP_REPLACE(m.name, '\\s+', ' ', 'g'))) = ${normalized}
          LIMIT 2
        `;

    if (rows.length === 0) return { ok: false, reason: "invalid" };
    if (rows.length > 1) return { ok: false, reason: "ambiguous" };

    const row = rows[0];
    const lockedUntil = row.locked_until
      ? new Date(String(row.locked_until))
      : null;

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
        UPDATE member_users
        SET failed_attempts = ${shouldLock ? 0 : attempts},
            locked_until = ${
              shouldLock
                ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString()
                : null
            }
        WHERE member_id = ${row.member_id as string}
      `;

      if (shouldLock) {
        return { ok: false, reason: "locked", minutesLeft: LOCK_MINUTES };
      }
      return { ok: false, reason: "invalid" };
    }

    const upgraded = isHashed(stored) ? stored : await hashPassword(password);

    await sql`
      UPDATE member_users
      SET failed_attempts = 0,
          locked_until = NULL,
          last_login_at = NOW(),
          password = ${upgraded}
      WHERE member_id = ${row.member_id as string}
    `;

    return {
      ok: true,
      member: {
        memberId: row.member_id as string,
        email: row.email as string,
        name: row.name as string,
        mustChangePassword: Boolean(row.must_change_password),
      },
    };
  });
}

/** ตั้ง/รีเซ็ตรหัสผ่าน portal ให้สมาชิก — เรียกจากฝั่งพนักงาน */
export async function setMemberPassword(
  memberId: string,
  email: string,
  password: string
): Promise<MemberAccount> {
  const hashed = await hashPassword(password);
  return withDb(async (sql) => {
    const rows = await sql`
      INSERT INTO member_users (member_id, email, password, must_change_password)
      VALUES (${memberId}, ${email}, ${hashed}, TRUE)
      ON CONFLICT (member_id) DO UPDATE
      SET email = ${email},
          password = ${hashed},
          must_change_password = TRUE,
          failed_attempts = 0,
          locked_until = NULL
      RETURNING member_id, email, must_change_password, last_login_at
    `;
    const row = rows[0];
    return {
      memberId: row.member_id as string,
      email: row.email as string,
      mustChangePassword: Boolean(row.must_change_password),
      lastLoginAt: row.last_login_at
        ? toISODate(row.last_login_at)
        : null,
    };
  });
}

export async function listMemberAccounts(): Promise<MemberAccount[]> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT member_id, email, must_change_password, last_login_at
      FROM member_users
    `;
    return rows.map((row) => ({
      memberId: row.member_id as string,
      email: row.email as string,
      mustChangePassword: Boolean(row.must_change_password),
      lastLoginAt: row.last_login_at
        ? toISODate(row.last_login_at)
        : null,
    }));
  });
}

export async function revokeMemberAccess(memberId: string): Promise<boolean> {
  return withDb(async (sql) => {
    const rows = await sql`
      DELETE FROM member_users WHERE member_id = ${memberId} RETURNING member_id
    `;
    return rows.length > 0;
  });
}

export async function changeMemberPassword(
  memberId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT password FROM member_users WHERE member_id = ${memberId} LIMIT 1
    `;
    if (rows.length === 0) return { ok: false, error: "ไม่พบบัญชีสมาชิก" };

    const stored = rows[0].password as string;
    if (!(await verifyPassword(currentPassword, stored))) {
      return { ok: false, error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };
    }
    if (await verifyPassword(newPassword, stored)) {
      return { ok: false, error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม" };
    }

    const hashed = await hashPassword(newPassword);
    await sql`
      UPDATE member_users
      SET password = ${hashed}, must_change_password = FALSE
      WHERE member_id = ${memberId}
    `;
    return { ok: true };
  });
}

export async function loadMemberPortalData(
  memberId: string
): Promise<MemberPortalData | null> {
  return withDb(async (sql) => {
    const memberRows = await sql`
      SELECT id, name, email, phone, package_id, joined_at, expires_at, status,
             sessions_total, sessions_used
      FROM members WHERE id = ${memberId} LIMIT 1
    `;
    if (memberRows.length === 0) return null;
    const m = memberRows[0];

    const packageRows = await sql`
      SELECT name, price, duration_days, session_limit, features
      FROM membership_packages WHERE id = ${m.package_id as string} LIMIT 1
    `;
    const bookingRows = await sql`
      SELECT id, type, resource_name, date, time, status
      FROM bookings WHERE member_id = ${memberId}
      ORDER BY date DESC, time DESC
    `;
    const promotionRows = await sql`
      SELECT id, title, description, discount_type, discount_value,
             package_id, code, start_date, end_date, status, highlight
      FROM promotions WHERE status = 'active'
      ORDER BY highlight DESC, end_date
    `;
    const allPackageRows = await sql`
      SELECT id, name, description, price, duration_days, session_limit, features, status, popular
      FROM membership_packages WHERE status = 'active' ORDER BY price
    `;

    return {
      member: {
        id: m.id as string,
        name: m.name as string,
        email: m.email as string,
        phone: m.phone as string,
        packageId: m.package_id as string,
        joinedAt: toISODate(m.joined_at),
        expiresAt: toISODate(m.expires_at),
        status: m.status as string,
        sessionsTotal:
          m.sessions_total != null ? Number(m.sessions_total) : null,
        sessionsUsed: Number(m.sessions_used ?? 0),
      },
      package:
        packageRows.length > 0
          ? {
              name: packageRows[0].name as string,
              price: Number(packageRows[0].price),
              durationDays: Number(packageRows[0].duration_days),
              sessionLimit:
                packageRows[0].session_limit != null
                  ? Number(packageRows[0].session_limit)
                  : null,
              features: packageRows[0].features as string[],
            }
          : null,
      bookings: bookingRows.map((b) => ({
        id: b.id as string,
        type: b.type as string,
        resourceName: b.resource_name as string,
        date: toISODate(b.date),
        time: b.time as string,
        status: b.status as string,
      })),
      promotions: promotionRows.map((p) => ({
        id: p.id as string,
        title: p.title as string,
        description: p.description as string,
        discountType: p.discount_type as Promotion["discountType"],
        discountValue: Number(p.discount_value),
        packageId: (p.package_id as string | null) ?? null,
        code: (p.code as string | null) ?? null,
        startDate: toISODate(p.start_date),
        endDate: toISODate(p.end_date),
        status: p.status as Promotion["status"],
        highlight: Boolean(p.highlight),
      })),
      packages: allPackageRows.map((p) => ({
        id: p.id as string,
        name: p.name as string,
        description: p.description as string,
        price: Number(p.price),
        durationDays: Number(p.duration_days),
        sessionLimit:
          p.session_limit != null ? Number(p.session_limit) : null,
        features: p.features as string[],
        status: p.status as MembershipPackage["status"],
        popular: Boolean(p.popular),
      })),
    };
  });
}
