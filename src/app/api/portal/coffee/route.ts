import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth-server";
import {
  getLoyaltyEvents,
  getOrCreateLoyalty,
} from "@/lib/db/coffee-loyalty";

export async function GET() {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const loyalty = await getOrCreateLoyalty(session.memberId);
    if (!loyalty) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสมาชิก" }, { status: 404 });
    }

    const events = await getLoyaltyEvents(session.memberId, 10);

    return NextResponse.json({
      member: {
        id: session.memberId,
        name: session.name,
        email: session.email,
      },
      loyalty,
      events,
    });
  } catch (error) {
    console.error("GET /api/portal/coffee failed:", error);
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
