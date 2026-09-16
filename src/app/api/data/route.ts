import { NextResponse } from "next/server";
import { AppData } from "@/lib/types";
import {
  CancelActor,
  getOrInitAppData,
  isDbConfigured,
  persistAppData,
} from "@/lib/db";
import { getServerSession } from "@/lib/auth-server";
import { isValidRole } from "@/lib/permissions";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Connect Supabase and set POSTGRES_URL." },
      { status: 503 }
    );
  }

  try {
    const data = await getOrInitAppData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/data failed:", error);
    return NextResponse.json(
      { error: "Failed to load data from database", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Connect Supabase and set POSTGRES_URL." },
      { status: 503 }
    );
  }

  try {
    const data = (await request.json()) as AppData;

    // ต้องอ่านผู้ใช้จาก session ฝั่งเซิร์ฟเวอร์ ไม่ใช่จาก payload ที่ client ส่งมา
    const session = await getServerSession();
    const actor: CancelActor | null =
      session && isValidRole(session.role)
        ? { name: session.name, role: session.role }
        : null;

    const result = await persistAppData(data, actor);
    return NextResponse.json({
      ok: true,
      rejectedBookings: result.rejectedBookings,
    });
  } catch (error) {
    console.error("PUT /api/data failed:", error);
    return NextResponse.json(
      { error: "Failed to save data to database", detail: String(error) },
      { status: 500 }
    );
  }
}
