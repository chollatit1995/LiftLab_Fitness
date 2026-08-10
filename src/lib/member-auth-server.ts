import { cookies } from "next/headers";
import {
  MEMBER_SESSION_COOKIE,
  verifyMemberSession,
  VerifiedMemberSession,
} from "./auth";

export async function getMemberSession(): Promise<VerifiedMemberSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyMemberSession(token);
}
