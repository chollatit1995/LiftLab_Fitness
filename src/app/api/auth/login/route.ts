import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { withDb } from "@/lib/db/client";
import { seedDefaultUsers, validateCredentials } from "@/lib/db/users";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลและรหัสผ่าน" },
        { status: 400 }
      );
    }

    // สร้างตาราง app_users + seed บัญชีเริ่มต้นถ้ายังไม่มี
    await withDb(async (sql) => ensureSchema(sql));
    await seedDefaultUsers();

    const user = await validateCredentials(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const token = await createSession(user);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
