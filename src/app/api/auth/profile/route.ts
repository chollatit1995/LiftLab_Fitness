import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { getServerSession } from "@/lib/auth-server";
import { getUserById, updateOwnProfile } from "@/lib/db/users";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getUserById(session.id);
    if (!user) {
      return NextResponse.json({ error: "ไม่พบบัญชีผู้ใช้" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/auth/profile failed:", error);
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await request.json();
    const trimmed = typeof name === "string" ? name.trim() : "";

    if (!trimmed) {
      return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });
    }

    const user = await updateOwnProfile(session.id, trimmed);
    if (!user) {
      return NextResponse.json({ error: "ไม่พบบัญชีผู้ใช้" }, { status: 404 });
    }

    const token = await createSession({
      id: session.id,
      email: session.email,
      name: user.name,
      role: session.role,
      mustChangePassword: session.mustChangePassword,
      maxAge: session.maxAge,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(session.maxAge));

    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT /api/auth/profile failed:", error);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}
