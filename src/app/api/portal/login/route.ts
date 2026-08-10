import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createMemberSession,
  MEMBER_SESSION_COOKIE,
  SESSION_MAX_AGE,
  SESSION_MAX_AGE_REMEMBERED,
  sessionCookieOptions,
} from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { withDb } from "@/lib/db/client";
import { authenticateMember } from "@/lib/db/member-users";

export async function POST(request: Request) {
  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลและรหัสผ่าน" },
        { status: 400 }
      );
    }

    await withDb(async (sql) => ensureSchema(sql));

    const result = await authenticateMember(email, password);

    if (!result.ok) {
      if (result.reason === "locked") {
        return NextResponse.json(
          {
            error: `บัญชีถูกล็อกชั่วคราว กรุณาลองใหม่ใน ${result.minutesLeft} นาที`,
          },
          { status: 423 }
        );
      }
      return NextResponse.json(
        { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const maxAge = rememberMe ? SESSION_MAX_AGE_REMEMBERED : SESSION_MAX_AGE;
    const token = await createMemberSession({ ...result.member, maxAge });

    const cookieStore = await cookies();
    cookieStore.set(MEMBER_SESSION_COOKIE, token, sessionCookieOptions(maxAge));

    return NextResponse.json({ ok: true, member: result.member });
  } catch (error) {
    console.error("Member login failed:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
