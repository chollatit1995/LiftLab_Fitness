import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, VerifiedSession } from "./auth";

export async function getServerSession(): Promise<VerifiedSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
