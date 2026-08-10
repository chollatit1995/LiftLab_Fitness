import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createMemberSession,
  createSession,
  MEMBER_SESSION_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SESSION_MAX_AGE_REMEMBERED,
  sessionCookieOptions,
} from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { withDb } from "@/lib/db/client";
import { authenticate, seedDefaultUsers } from "@/lib/db/users";
import { authenticateMember } from "@/lib/db/member-users";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const login = String(body.login ?? body.name ?? body.email ?? "").trim();
    const password = body.password;
    const rememberMe = Boolean(body.rememberMe);

    if (!login || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อและรหัสผ่าน" },
        { status: 400 }
      );
    }

    // สร้าง/อัปเดตตาราง app_users + seed บัญชีเริ่มต้นถ้ายังไม่มี
    await withDb(async (sql) => ensureSchema(sql));
    await seedDefaultUsers();

    const maxAge = rememberMe ? SESSION_MAX_AGE_REMEMBERED : SESSION_MAX_AGE;
    const cookieStore = await cookies();

    // พนักงานมาก่อน ถ้าชื่อ/อีเมลไม่ได้อยู่ใน app_users หรือรหัสไม่ตรง ค่อยลองฝั่งสมาชิก
    const staffResult = await authenticate(login, password);

    if (staffResult.ok) {
      const token = await createSession({ ...staffResult.user, maxAge });
      cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));

      return NextResponse.json({
        ok: true,
        scope: "staff",
        user: staffResult.user,
        mustChangePassword: staffResult.user.mustChangePassword,
      });
    }

    if (staffResult.reason === "ambiguous") {
      return NextResponse.json(
        {
          error:
            "พบชื่อซ้ำในระบบ กรุณาใช้ชื่อให้ตรงกับบัญชี หรือติดต่อผู้ดูแลระบบ",
        },
        { status: 409 }
      );
    }

    if (staffResult.reason === "locked") {
      return NextResponse.json(
        {
          error: `บัญชีถูกล็อกชั่วคราวจากการกรอกรหัสผ่านผิดหลายครั้ง กรุณาลองใหม่ใน ${staffResult.minutesLeft} นาที`,
        },
        { status: 423 }
      );
    }

    const memberResult = await authenticateMember(login, password);

    if (memberResult.ok) {
      const token = await createMemberSession({ ...memberResult.member, maxAge });
      cookieStore.set(
        MEMBER_SESSION_COOKIE,
        token,
        sessionCookieOptions(maxAge)
      );

      return NextResponse.json({
        ok: true,
        scope: "member",
        member: memberResult.member,
        mustChangePassword: memberResult.member.mustChangePassword,
      });
    }

    if (memberResult.reason === "ambiguous") {
      return NextResponse.json(
        {
          error:
            "พบชื่อสมาชิกซ้ำในระบบ กรุณาติดต่อเคาน์เตอร์เพื่อยืนยันบัญชี",
        },
        { status: 409 }
      );
    }

    if (memberResult.reason === "locked") {
      return NextResponse.json(
        {
          error: `บัญชีถูกล็อกชั่วคราวจากการกรอกรหัสผ่านผิดหลายครั้ง กรุณาลองใหม่ใน ${memberResult.minutesLeft} นาที`,
        },
        { status: 423 }
      );
    }

    // เตือนจำนวนครั้งที่เหลือได้เฉพาะตอนที่รู้ว่าชื่อมีอยู่จริงในฝั่งพนักงาน
    const suffix =
      staffResult.remainingAttempts !== null &&
      staffResult.remainingAttempts <= 2
        ? ` (เหลืออีก ${staffResult.remainingAttempts} ครั้งก่อนถูกล็อก)`
        : "";

    return NextResponse.json(
      { error: `ชื่อหรือรหัสผ่านไม่ถูกต้อง${suffix}` },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
