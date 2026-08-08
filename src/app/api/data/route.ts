import { NextResponse } from "next/server";
import { AppData } from "@/lib/types";
import {
  getOrInitAppData,
  isDbConfigured,
  saveAppData,
} from "@/lib/db";

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
      { error: "Failed to load data from database" },
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
    await saveAppData(data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/data failed:", error);
    return NextResponse.json(
      { error: "Failed to save data to database" },
      { status: 500 }
    );
  }
}
