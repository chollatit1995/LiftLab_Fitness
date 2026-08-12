import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { can } from "@/lib/permissions";
import {
  addCoffeeStamp,
  confirmStampRequest,
  getLoyaltyEvents,
  getOrCreateLoyalty,
  listPendingRequests,
  redeemFreeCoffee,
  rejectStampRequest,
  searchMembersForCoffee,
} from "@/lib/db/coffee-loyalty";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || !can(session.role, "coffee.stamp")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const memberId = searchParams.get("memberId")?.trim() ?? "";
    const pending = searchParams.get("pending") === "1";

    if (pending) {
      const requests = await listPendingRequests();
      return NextResponse.json({ requests });
    }

    if (memberId) {
      const loyalty = await getOrCreateLoyalty(memberId);
      if (!loyalty) {
        return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 404 });
      }
      const events = await getLoyaltyEvents(memberId, 12);
      return NextResponse.json({ loyalty, events });
    }

    const members = q ? await searchMembersForCoffee(q) : [];
    return NextResponse.json({ members });
  } catch (error) {
    console.error("GET /api/coffee failed:", error);
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || !can(session.role, "coffee.stamp")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = String(body.action ?? "confirm");
    const requestId = String(body.requestId ?? "");
    const memberId = String(body.memberId ?? "");

    if (action === "confirm") {
      if (!requestId) {
        return NextResponse.json({ error: "ไม่พบรหัสคำขอ" }, { status: 400 });
      }
      const result = await confirmStampRequest(requestId, session.name);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === "reject") {
      if (!requestId) {
        return NextResponse.json({ error: "ไม่พบรหัสคำขอ" }, { status: 400 });
      }
      const result = await rejectStampRequest(requestId, session.name);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (!memberId) {
      return NextResponse.json({ error: "กรุณาเลือกสมาชิก" }, { status: 400 });
    }

    if (action === "redeem") {
      const result = await redeemFreeCoffee(memberId, session.name);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === "stamp") {
      const result = await addCoffeeStamp(memberId, session.name);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/coffee failed:", error);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}
