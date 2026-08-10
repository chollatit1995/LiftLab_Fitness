import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth-server";
import { createSql, getDatabaseUrl } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** ตัดทุกขั้นตอนที่ค้าง เพื่อให้ endpoint ตอบกลับได้เสมอและบอกได้ว่าค้างตรงไหน */
const STEP_TIMEOUT_MS = 8000;

interface StepResult {
  name: string;
  ms: number;
  ok: boolean;
  rows?: number;
  error?: string;
}

async function step(
  name: string,
  run: () => Promise<readonly unknown[]>
): Promise<StepResult> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const rows = await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`timeout > ${STEP_TIMEOUT_MS}ms`)),
          STEP_TIMEOUT_MS
        );
      }),
    ]);
    return { name, ms: Date.now() - started, ok: true, rows: rows.length };
  } catch (error) {
    return {
      name,
      ms: Date.now() - started,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET() {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }

  const url = getDatabaseUrl() ?? "";
  const host = url ? new URL(url).host : "unset";
  const steps: StepResult[] = [];
  const started = Date.now();

  const sql = createSql();
  try {
    steps.push(await step("connect", () => sql`SELECT 1 AS ok`));
    steps.push(
      await step(
        "members",
        () => sql`SELECT id FROM members WHERE id = ${session.memberId} LIMIT 1`
      )
    );
    steps.push(
      await step(
        "bookings",
        () => sql`SELECT id FROM bookings WHERE member_id = ${session.memberId}`
      )
    );
    steps.push(
      await step(
        "packages",
        () => sql`SELECT id FROM membership_packages WHERE status = 'active'`
      )
    );
    steps.push(
      await step(
        "promotions_exists",
        () => sql`SELECT to_regclass('public.promotions') AS reg`
      )
    );
    steps.push(
      await step(
        "promotions_select",
        () => sql`SELECT id FROM promotions WHERE status = 'active'`
      )
    );
    steps.push(
      await step("parallel_four", async () => {
        const result = await Promise.all([
          sql`SELECT id FROM members WHERE id = ${session.memberId} LIMIT 1`,
          sql`SELECT id FROM bookings WHERE member_id = ${session.memberId}`,
          sql`SELECT id FROM promotions WHERE status = 'active'`,
          sql`SELECT id FROM membership_packages WHERE status = 'active'`,
        ]);
        return result.flat();
      })
    );
  } finally {
    // ห้าม await — ถ้าคอนเนกชันค้างอยู่ การปิดจะค้างตามไปด้วย
    void sql.end({ timeout: 1 }).catch(() => {});
  }

  return NextResponse.json({
    host,
    totalMs: Date.now() - started,
    steps,
  });
}
