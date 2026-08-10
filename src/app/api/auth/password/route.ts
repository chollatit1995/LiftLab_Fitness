import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { getServerSession } from "@/lib/auth-server";
import { checkPasswordStrength } from "@/lib/password";
import { changeOwnPassword } from "@/lib/db/users";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "กรุณากรอกรหัสผ่านให้ครบ" },
        { status: 400 }
      );
    }

    const strength = checkPasswordStrength(newPassword);
    if (!strength.ok) {
      return NextResponse.json({ error: strength.message }, { status: 400 });
    }

    const result = await changeOwnPassword(
      session.id,
      currentPassword,
      newPassword
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // ออก token ใหม่เพื่อล้าง flag บังคับเปลี่ยนรหัสผ่านออกจาก session
    const token = await createSession({
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      mustChangePassword: false,
      maxAge: session.maxAge,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(session.maxAge));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Change password failed:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
