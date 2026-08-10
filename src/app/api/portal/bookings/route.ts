import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth-server";
import {
  cancelMemberBooking,
  createMemberBooking,
  loadBookingCatalog,
} from "@/lib/db/bookings";
import { BookingType } from "@/lib/types";

export async function GET() {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const catalog = await loadBookingCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    console.error("GET /api/portal/bookings failed:", error);
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const type = body.type as BookingType;
    const resourceId = String(body.resourceId ?? "");
    const resourceName = String(body.resourceName ?? "");
    const date = String(body.date ?? "");
    const time = String(body.time ?? "");
    const notes = body.notes ? String(body.notes) : undefined;

    if (!type || !resourceId || !resourceName || !date || !time) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
    }
    if (type !== "class" && type !== "trainer") {
      return NextResponse.json(
        { error: "สมาชิกจองได้เฉพาะคลาสและเทรนเนอร์" },
        { status: 400 }
      );
    }

    const result = await createMemberBooking({
      memberId: session.memberId,
      type,
      resourceId,
      resourceName,
      date,
      time,
      notes,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    console.error("POST /api/portal/bookings failed:", error);
    return NextResponse.json({ error: "จองไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = request.nextUrl.searchParams.get("id");
  if (!bookingId) {
    return NextResponse.json({ error: "ไม่พบรหัสการจอง" }, { status: 400 });
  }

  try {
    const result = await cancelMemberBooking(session.memberId, bookingId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/portal/bookings failed:", error);
    return NextResponse.json({ error: "ยกเลิกไม่สำเร็จ" }, { status: 500 });
  }
}
