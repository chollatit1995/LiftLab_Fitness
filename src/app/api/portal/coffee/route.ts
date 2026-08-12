import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth-server";
import { ensureSchema } from "@/lib/db";
import { withDb } from "@/lib/db/client";
import {
  createStampRequest,
  getLoyaltyEvents,
  getMemberPendingRequest,
  getMemberRecentRequests,
  getOrCreateLoyalty,
} from "@/lib/db/coffee-loyalty";
import { CoffeeRequestType } from "@/lib/coffee-loyalty";

export async function GET() {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await withDb(async (sql) => ensureSchema(sql));

    const loyalty = await getOrCreateLoyalty(session.memberId);
    if (!loyalty) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสมาชิก" }, { status: 404 });
    }

    // รันทีละอัน — pool max:1 ถ้า Promise.all จะ deadlock
    const events = await getLoyaltyEvents(session.memberId, 10);
    const pendingRequest = await getMemberPendingRequest(session.memberId);
    const requests = await getMemberRecentRequests(session.memberId, 8);

    return NextResponse.json({
      member: {
        id: session.memberId,
        name: session.name,
        email: session.email,
      },
      loyalty,
      events,
      pendingRequest,
      requests,
    });
  } catch (error) {
    console.error("GET /api/portal/coffee failed:", error);
    return NextResponse.json(
      { error: "โหลดข้อมูลไม่สำเร็จ", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await withDb(async (sql) => ensureSchema(sql));

    const body = await request.json().catch(() => ({}));
    const requestType = (body.requestType === "redeem" ? "redeem" : "stamp") as CoffeeRequestType;

    const result = await createStampRequest(session.memberId, requestType);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/portal/coffee failed:", error);
    return NextResponse.json(
      { error: "ส่งคำขอไม่สำเร็จ", detail: String(error) },
      { status: 500 }
    );
  }
}
