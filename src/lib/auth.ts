import { SignJWT, jwtVerify } from "jose";

export interface SessionPayload {
  email: string;
  name: string;
  role: string;
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
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export function validateCredentials(
  email: string,
  password: string
): SessionPayload | null {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@liftlab.fitness";
  const adminPassword = process.env.ADMIN_PASSWORD || "LiftLab@2026";

  const accounts: { email: string; password: string; name: string; role: string }[] = [
    { email: adminEmail, password: adminPassword, name: "ผู้ดูแลระบบ", role: "admin" },
    {
      email: process.env.MANAGER_EMAIL || "manager@liftlab.fitness",
      password: process.env.MANAGER_PASSWORD || "LiftLab@2026",
      name: "ผู้จัดการ",
      role: "manager",
    },
  ];

  const match = accounts.find(
    (a) => a.email === email && a.password === password
  );

  if (!match) return null;

  return { email: match.email, name: match.name, role: match.role };
}

export const SESSION_COOKIE = "liftlab_session";
