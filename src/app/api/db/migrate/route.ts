import { NextResponse } from "next/server";
import {
  ensureSchema,
  isDatabaseEmpty,
  isDbConfigured,
  seedDatabase,
} from "@/lib/db";

export async function POST() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Connect Supabase and set POSTGRES_URL." },
      { status: 503 }
    );
  }

  try {
    await ensureSchema();
    const empty = await isDatabaseEmpty();
    if (empty) {
      await seedDatabase();
      return NextResponse.json({
        ok: true,
        message: "Schema created and seed data inserted",
        seeded: true,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Schema verified (data already exists)",
      seeded: false,
    });
  } catch (error) {
    console.error("POST /api/db/migrate failed:", error);
    return NextResponse.json(
      { error: "Migration failed" },
      { status: 500 }
    );
  }
}
