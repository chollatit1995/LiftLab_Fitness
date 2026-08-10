import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SESSION_MAX_AGE_REMEMBERED,
  sessionCookieOptions,
} from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { withDb } from "@/lib/db/client";
import { authenticate, seedDefaultUsers } from "@/lib/db/users";

export async function POST(request: Request) {
  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลและรหัสผ่าน" },
        { status: 400 }
      );
    }

    // สร้าง/อัปเดตตาราง app_users + seed บัญชีเริ่มต้นถ้ายังไม่มี
    await withDb(async (sql) => ensureSchema(sql));
    await seedDefaultUsers();

    const result = await authenticate(email, password);

    if (!result.ok) {
      if (result.reason === "locked") {
        return NextResponse.json(
          {
            error: `บัญชีถูกล็อกชั่วคราวจากการกรอกรหัสผ่านผิดหลายครั้ง กรุณาลองใหม่ใน ${result.minutesLeft} นาที`,
          },
          { status: 423 }
        );
      }

      const suffix =
        result.remainingAttempts !== null && result.remainingAttempts <= 2
          ? ` (เหลืออีก ${result.remainingAttempts} ครั้งก่อนถูกล็อก)`
          : "";

      return NextResponse.json(
        { error: `อีเมลหรือรหัสผ่านไม่ถูกต้อง${suffix}` },
        { status: 401 }
      );
    }

    const maxAge = rememberMe ? SESSION_MAX_AGE_REMEMBERED : SESSION_MAX_AGE;
    const token = await createSession({ ...result.user, maxAge });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));

    return NextResponse.json({
      ok: true,
      user: result.user,
      mustChangePassword: result.user.mustChangePassword,
    });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
