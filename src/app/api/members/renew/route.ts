import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { renewMemberInDb } from "@/lib/db/renewals";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const memberId = String(body.memberId ?? "");
    const packageId = String(body.packageId ?? "");
    const promoCode = body.promoCode ? String(body.promoCode) : null;
    const autoPromo = body.autoPromo !== false;

    if (!memberId || !packageId) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
    }

    const result = await renewMemberInDb({
      memberId,
      packageId,
      promoCode,
      autoPromo,
      renewedBy: session.name,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/members/renew failed:", error);
    return NextResponse.json({ error: "ต่ออายุไม่สำเร็จ" }, { status: 500 });
  }
}
