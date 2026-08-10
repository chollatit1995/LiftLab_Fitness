import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { can } from "@/lib/permissions";
import { checkPasswordStrength } from "@/lib/password";
import {
  listMemberAccounts,
  revokeMemberAccess,
  setMemberPassword,
} from "@/lib/db/member-users";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await listMemberAccounts();
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("GET /api/members/access failed:", error);
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || !can(session.role, "members.grantAccess")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { memberId, email, password } = await request.json();

    if (!memberId || !email || !password) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบสำหรับตั้งรหัสผ่าน" },
        { status: 400 }
      );
    }

    const strength = checkPasswordStrength(password);
    if (!strength.ok) {
      return NextResponse.json({ error: strength.message }, { status: 400 });
    }

    const account = await setMemberPassword(memberId, email, password);
    return NextResponse.json(account);
  } catch (error) {
    console.error("POST /api/members/access failed:", error);
    const message = String(error);
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json(
        { error: "อีเมลนี้ถูกใช้กับบัญชีสมาชิกอื่นแล้ว" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "ตั้งรหัสผ่านไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!session || !can(session.role, "members.grantAccess")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
    }

    const removed = await revokeMemberAccess(memberId);
    if (!removed) {
      return NextResponse.json({ error: "ไม่พบบัญชีสมาชิก" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/members/access failed:", error);
    return NextResponse.json({ error: "ยกเลิกสิทธิ์ไม่สำเร็จ" }, { status: 500 });
  }
}
