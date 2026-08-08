import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const user = await verifySession(token);
  if (!user) {
    cookieStore.delete(SESSION_COOKIE);
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}
