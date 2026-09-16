import { NextResponse } from "next/server";
import { AppData } from "@/lib/types";
import {
  getOrInitAppData,
  isDbConfigured,
  persistAppData,
  SaveActor,
} from "@/lib/db";
import { getServerSession } from "@/lib/auth-server";
import { isValidRole } from "@/lib/permissions";
import { resolveUserIdentity } from "@/lib/db/users";

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

    /**
     * ตัวตนต้องมาจาก session ฝั่งเซิร์ฟเวอร์ ไม่ใช่จาก payload ที่ client ส่งมา
     * และต้องอ่าน role จากฐานข้อมูล เพราะ role ใน JWT อาจเก่าถ้าเพิ่งเปลี่ยนตำแหน่ง
     */
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const identity = await resolveUserIdentity(session.id);
    const role = identity?.role ?? session.role;
    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actor: SaveActor = {
      name: session.name,
      role,
      staffId: identity?.staffId ?? null,
    };

    const result = await persistAppData(data, actor);
    return NextResponse.json({
      ok: true,
      rejectedBookings: result.rejectedBookings,
      blockedCollections: result.blockedCollections,
      blockedBookings: result.blockedBookings,
    });
  } catch (error) {
    console.error("PUT /api/data failed:", error);
    return NextResponse.json(
      { error: "Failed to save data to database", detail: String(error) },
      { status: 500 }
    );
  }
}
