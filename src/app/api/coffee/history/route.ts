import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { can } from "@/lib/permissions";
import { ensureSchema } from "@/lib/db";
import { withDb } from "@/lib/db/client";
import { getCoffeeHistory } from "@/lib/db/coffee-loyalty";
import { todayISO } from "@/lib/dates";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || !can(session.role, "coffee.history")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await withDb(async (sql) => ensureSchema(sql));

    const { searchParams } = new URL(request.url);
    const to = searchParams.get("to")?.trim() || todayISO();
    const from =
      searchParams.get("from")?.trim() ||
      new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const data = await getCoffeeHistory(from, to);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/coffee/history failed:", error);
    return NextResponse.json(
      { error: "โหลดประวัติไม่สำเร็จ", detail: String(error) },
      { status: 500 }
    );
  }
}
