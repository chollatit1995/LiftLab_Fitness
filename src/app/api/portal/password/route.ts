import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createMemberSession,
  MEMBER_SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { getMemberSession } from "@/lib/member-auth-server";
import { checkPasswordStrength } from "@/lib/password";
import { changeMemberPassword } from "@/lib/db/member-users";

export async function POST(request: Request) {
  const session = await getMemberSession();
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

    const result = await changeMemberPassword(
      session.memberId,
      currentPassword,
      newPassword
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const token = await createMemberSession({
      memberId: session.memberId,
      email: session.email,
      name: session.name,
      mustChangePassword: false,
      maxAge: session.maxAge,
    });

    const cookieStore = await cookies();
    cookieStore.set(
      MEMBER_SESSION_COOKIE,
      token,
      sessionCookieOptions(session.maxAge)
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Member change password failed:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
