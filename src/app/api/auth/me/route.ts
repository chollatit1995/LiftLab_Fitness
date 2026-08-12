import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifySession,
} from "@/lib/auth";
import { resolveUserRoleById } from "@/lib/db/users";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const session = await verifySession(token);
  if (!session) {
    cookieStore.delete(SESSION_COOKIE);
    return NextResponse.json({ user: null });
  }

  const role = (await resolveUserRoleById(session.id)) ?? session.role;

  const response = NextResponse.json({
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      role,
      mustChangePassword: session.mustChangePassword,
    },
    expiresAt: session.expiresAt,
  });

  // อัปเดต JWT เมื่อ role จริงเปลี่ยน (เช่น พนักงานที่เป็นเทรนเนอร์แต่บันทึกเป็น staff)
  if (role !== session.role) {
    const token = await createSession({
      id: session.id,
      email: session.email,
      name: session.name,
      role,
      mustChangePassword: session.mustChangePassword,
      maxAge: session.maxAge,
    });
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(session.maxAge)
    );
  }

  return response;
}
