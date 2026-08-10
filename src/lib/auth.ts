import { SignJWT, jwtVerify } from "jose";

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
  /** อายุ session ที่ผู้ใช้เลือกตอน login (วินาที) — ใช้ตอนต่ออายุอัตโนมัติ */
  maxAge: number;
}

export interface VerifiedSession extends SessionPayload {
  /** เวลาหมดอายุของ token ปัจจุบัน (epoch seconds) */
  expiresAt: number;
  issuedAt: number;
}

export interface MemberSessionPayload {
  memberId: string;
  email: string;
  name: string;
  mustChangePassword: boolean;
  maxAge: number;
}

export interface VerifiedMemberSession extends MemberSessionPayload {
  expiresAt: number;
}

export const SESSION_COOKIE = "liftlab_session";
/** สมาชิกใช้ cookie คนละใบกับพนักงาน เพื่อไม่ให้ session ทั้งสองฝั่งทับกัน */
export const MEMBER_SESSION_COOKIE = "liftlab_member_session";

export const SESSION_MAX_AGE = 60 * 60 * 24; // 1 วัน
export const SESSION_MAX_AGE_REMEMBERED = 60 * 60 * 24 * 30; // 30 วัน

/** ต่ออายุ token เมื่อเวลาที่เหลือน้อยกว่าครึ่งหนึ่งของอายุเต็ม */
export function shouldRenew(session: VerifiedSession, nowSeconds: number): boolean {
  const remaining = session.expiresAt - nowSeconds;
  return remaining > 0 && remaining < session.maxAge / 2;
}

function getSecret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "liftlab-dev-secret-change-in-production"
  );
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${payload.maxAge}s`)
    .sign(getSecret());
}

export async function verifySession(
  token: string
): Promise<VerifiedSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    // token ของสมาชิกต้องใช้เข้าหลังบ้านไม่ได้
    if (payload.scope === "member") return null;
    const maxAge = Number(payload.maxAge) || SESSION_MAX_AGE;
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
      mustChangePassword: Boolean(payload.mustChangePassword),
      maxAge,
      expiresAt: Number(payload.exp ?? 0),
      issuedAt: Number(payload.iat ?? 0),
    };
  } catch {
    return null;
  }
}

export async function createMemberSession(
  payload: MemberSessionPayload
): Promise<string> {
  return new SignJWT({ ...payload, scope: "member" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${payload.maxAge}s`)
    .sign(getSecret());
}

export async function verifyMemberSession(
  token: string
): Promise<VerifiedMemberSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    // token ของพนักงานต้องใช้กับ portal ไม่ได้ แม้จะเซ็นด้วย secret เดียวกัน
    if (payload.scope !== "member") return null;
    return {
      memberId: payload.memberId as string,
      email: payload.email as string,
      name: payload.name as string,
      mustChangePassword: Boolean(payload.mustChangePassword),
      maxAge: Number(payload.maxAge) || SESSION_MAX_AGE,
      expiresAt: Number(payload.exp ?? 0),
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}
