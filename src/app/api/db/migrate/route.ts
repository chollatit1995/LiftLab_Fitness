import { NextResponse } from "next/server";
import {
  ensureSchema,
  isDatabaseEmpty,
  isDbConfigured,
  saveAppData,
} from "@/lib/db";
import { withDb } from "@/lib/db/client";
import { initialData } from "@/lib/store";

async function runMigration() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Connect Supabase and set POSTGRES_URL." },
      { status: 503 }
    );
  }

  try {
    const result = await withDb(async (sql) => {
      await ensureSchema(sql);
      const empty = await isDatabaseEmpty(sql);
      if (empty) {
        await saveAppData(initialData, sql);
        return { seeded: true };
      }
      return { seeded: false };
    });

    return NextResponse.json({
      ok: true,
      message: result.seeded
        ? "Schema created and seed data inserted"
        : "Schema verified (data already exists)",
      seeded: result.seeded,
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
