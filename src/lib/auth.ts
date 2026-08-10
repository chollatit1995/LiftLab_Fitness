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

export const SESSION_COOKIE = "liftlab_session";

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

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}
