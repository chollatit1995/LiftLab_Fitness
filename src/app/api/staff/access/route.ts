import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { can } from "@/lib/permissions";
import { checkPasswordStrength } from "@/lib/password";
import { createStaffAccount, listStaffAccountIds } from "@/lib/db/users";

export async function GET() {
  const session = await getServerSession();
  if (!session || !can(session.role, "staff.grantAccess")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const staffIds = await listStaffAccountIds();
    return NextResponse.json({ staffIds });
  } catch (error) {
    console.error("GET /api/staff/access failed:", error);
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || !can(session.role, "staff.grantAccess")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { staffId, email, name, password } = await request.json();

    if (!staffId || !email || !name || !password) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบสำหรับสร้างบัญชี" },
        { status: 400 }
      );
    }

    const strength = checkPasswordStrength(password);
    if (!strength.ok) {
      return NextResponse.json({ error: strength.message }, { status: 400 });
    }

    const result = await createStaffAccount({ staffId, email, name, password });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json(result.user, { status: 201 });
  } catch (error) {
    console.error("POST /api/staff/access failed:", error);
    return NextResponse.json({ error: "สร้างบัญชีไม่สำเร็จ" }, { status: 500 });
  }
}
