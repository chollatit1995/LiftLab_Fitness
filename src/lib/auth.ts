import { SignJWT, jwtVerify } from "jose";

export interface SessionPayload {
  id: string;
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
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "liftlab_session";
