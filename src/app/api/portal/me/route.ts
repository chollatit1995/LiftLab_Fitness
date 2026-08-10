import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth-server";
import { loadMemberPortalData } from "@/lib/db/member-users";

export async function GET() {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ member: null });
  }

  try {
    const data = await loadMemberPortalData(session.memberId);
    if (!data) {
      return NextResponse.json({ member: null });
    }
    return NextResponse.json({
      ...data,
      mustChangePassword: session.mustChangePassword,
    });
  } catch (error) {
    console.error("GET /api/portal/me failed:", error);
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
