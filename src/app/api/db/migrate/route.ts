import { NextResponse } from "next/server";
import {
  ensureSchema,
  isDatabaseEmpty,
  isDbConfigured,
  seedDatabase,
} from "@/lib/db";

async function runMigration() {
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
    console.error("Migration failed:", error);
    return NextResponse.json(
      { error: "Migration failed", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return runMigration();
}

export async function POST() {
  return runMigration();
}
