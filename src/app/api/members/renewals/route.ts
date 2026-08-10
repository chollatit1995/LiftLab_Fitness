import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { listRenewalsForMember } from "@/lib/db/renewals";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = new URL(request.url).searchParams.get("memberId");
  if (!memberId) {
    return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
  }

  try {
    const renewals = await listRenewalsForMember(memberId);
    return NextResponse.json(renewals);
  } catch (error) {
    console.error("GET /api/members/renewals failed:", error);
    return NextResponse.json({ error: "โหลดประวัติไม่สำเร็จ" }, { status: 500 });
  }
}
