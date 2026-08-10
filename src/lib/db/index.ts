import { AppData } from "../types";
import { initialData } from "../store";
import { SCHEMA_STATEMENTS } from "./schema";
import { toISODate } from "../dates";
import { withDb } from "./client";
import { mergeById, mergeRenewals } from "./merge";
import { mapRenewalRow } from "./renewals";

export { isDbConfigured, getDatabaseUrl } from "./client";

export async function ensureSchema(sql: ReturnType<typeof import("postgres")>): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await sql.unsafe(statement);
  }
}

export async function isDatabaseEmpty(sql: ReturnType<typeof import("postgres")>): Promise<boolean> {
  const result = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM staff
  `;
  return result[0]?.count === 0;
}

export async function loadAppData(sql: ReturnType<typeof import("postgres")>): Promise<AppData> {
  const staff = await sql`SELECT id, name, email, phone, role, status, joined_at FROM staff ORDER BY joined_at`;
  const classes = await sql`SELECT id, name, description, trainer_id, capacity, duration, schedule, price, status FROM fitness_classes ORDER BY name`;
  const packages = await sql`SELECT id, name, description, price, duration_days, features, status, popular FROM membership_packages ORDER BY price`;
  const promotions = await sql`SELECT id, title, description, discount_type, discount_value, package_id, code, start_date, end_date, status, highlight FROM promotions ORDER BY highlight DESC, end_date`;
  const members = await sql`SELECT id, name, email, phone, package_id, joined_at, expires_at, status FROM members ORDER BY joined_at DESC`;
  const facilities = await sql`SELECT id, name, type, capacity, status FROM facilities ORDER BY name`;
  const bookings = await sql`SELECT id, type, member_id, resource_id, resource_name, date, time, status, notes FROM bookings ORDER BY date DESC, time DESC`;
  const sales = await sql`SELECT id, member_id, member_name, item, amount, date, type, original_amount, promotion_id FROM sales ORDER BY date DESC`;

  let renewalRows: Record<string, unknown>[] = [];
  try {
    renewalRows = await sql`
      SELECT id, member_id, member_name, package_id, package_name,
             previous_expires_at, new_expires_at, original_price, final_price,
             promotion_id, promotion_title, renewed_at, renewed_by
      FROM membership_renewals
      ORDER BY renewed_at DESC
    `;
  } catch {
    /* ตารางอาจยังไม่มี — migrate จะสร้างให้ */
  }

  return {
    staff: staff.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      email: r.email as string,
      phone: r.phone as string,
      role: r.role as AppData["staff"][0]["role"],
      status: r.status as AppData["staff"][0]["status"],
      joinedAt: toISODate(r.joined_at),
    })),
    classes: classes.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      description: r.description as string,
      trainerId: r.trainer_id as string,
      capacity: Number(r.capacity),
      duration: Number(r.duration),
      schedule: r.schedule as string,
      price: Number(r.price),
      status: r.status as AppData["classes"][0]["status"],
    })),
    packages: packages.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      description: r.description as string,
      price: Number(r.price),
      durationDays: Number(r.duration_days),
      features: r.features as string[],
      status: r.status as AppData["packages"][0]["status"],
      popular: Boolean(r.popular),
    })),
    promotions: promotions.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      description: r.description as string,
      discountType: r.discount_type as AppData["promotions"][0]["discountType"],
      discountValue: Number(r.discount_value),
      packageId: (r.package_id as string | null) ?? null,
      code: (r.code as string | null) ?? null,
      startDate: toISODate(r.start_date),
      endDate: toISODate(r.end_date),
      status: r.status as AppData["promotions"][0]["status"],
      highlight: Boolean(r.highlight),
    })),
    members: members.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      email: r.email as string,
      phone: r.phone as string,
      packageId: r.package_id as string,
      joinedAt: toISODate(r.joined_at),
      expiresAt: toISODate(r.expires_at),
      status: r.status as AppData["members"][0]["status"],
    })),
    facilities: facilities.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      type: r.type as string,
      capacity: Number(r.capacity),
      status: r.status as AppData["facilities"][0]["status"],
    })),
    bookings: bookings.map((r) => ({
      id: r.id as string,
      type: r.type as AppData["bookings"][0]["type"],
      memberId: r.member_id as string,
      resourceId: r.resource_id as string,
      resourceName: r.resource_name as string,
      date: toISODate(r.date),
      time: r.time as string,
      status: r.status as AppData["bookings"][0]["status"],
      notes: (r.notes as string | null) ?? undefined,
    })),
    sales: sales.map((r) => ({
      id: r.id as string,
      memberId: r.member_id as string,
      memberName: r.member_name as string,
      item: r.item as string,
      amount: Number(r.amount),
      date: toISODate(r.date),
      type: r.type as AppData["sales"][0]["type"],
      originalAmount:
        r.original_amount != null ? Number(r.original_amount) : undefined,
      promotionId: (r.promotion_id as string | null) ?? undefined,
    })),
    membershipRenewals: renewalRows.map(mapRenewalRow),
  };
}

/** ลบแถวที่ไม่อยู่ใน payload แล้ว upsert ทีละแถว — ไม่ลบทั้งตาราง */
async function syncIds(
  tx: { unsafe: (query: string) => Promise<unknown> },
  table: string,
  incomingIds: string[]
) {
  if (incomingIds.length === 0) {
    await tx.unsafe(`DELETE FROM ${table}`);
    return;
  }
  await tx.unsafe(
    `DELETE FROM ${table} WHERE id NOT IN (${incomingIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})`
  );
}

export async function saveAppData(data: AppData, sql: ReturnType<typeof import("postgres")>): Promise<void> {
  await sql.begin(async (tx) => {
    await syncIds(
      tx,
      "staff",
      data.staff.map((s) => s.id)
    );
    for (const s of data.staff) {
      await tx`
        INSERT INTO staff (id, name, email, phone, role, status, joined_at)
        VALUES (${s.id}, ${s.name}, ${s.email}, ${s.phone}, ${s.role}, ${s.status}, ${s.joinedAt})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          joined_at = EXCLUDED.joined_at
      `;
    }

    await syncIds(
      tx,
      "fitness_classes",
      data.classes.map((c) => c.id)
    );
    for (const c of data.classes) {
      await tx`
        INSERT INTO fitness_classes (id, name, description, trainer_id, capacity, duration, schedule, price, status)
        VALUES (${c.id}, ${c.name}, ${c.description}, ${c.trainerId}, ${c.capacity}, ${c.duration}, ${c.schedule}, ${c.price}, ${c.status})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          trainer_id = EXCLUDED.trainer_id,
          capacity = EXCLUDED.capacity,
          duration = EXCLUDED.duration,
          schedule = EXCLUDED.schedule,
          price = EXCLUDED.price,
          status = EXCLUDED.status
      `;
    }

    await syncIds(
      tx,
      "membership_packages",
      data.packages.map((p) => p.id)
    );
    for (const p of data.packages) {
      await tx`
        INSERT INTO membership_packages (id, name, description, price, duration_days, features, status, popular)
        VALUES (${p.id}, ${p.name}, ${p.description}, ${p.price}, ${p.durationDays}, ${tx.json(p.features)}, ${p.status}, ${p.popular ?? false})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          duration_days = EXCLUDED.duration_days,
          features = EXCLUDED.features,
          status = EXCLUDED.status,
          popular = EXCLUDED.popular
      `;
    }

    const promotions = data.promotions ?? [];
    await syncIds(
      tx,
      "promotions",
      promotions.map((p) => p.id)
    );
    for (const p of promotions) {
      await tx`
        INSERT INTO promotions (id, title, description, discount_type, discount_value, package_id, code, start_date, end_date, status, highlight)
        VALUES (${p.id}, ${p.title}, ${p.description}, ${p.discountType}, ${p.discountValue}, ${p.packageId}, ${p.code}, ${p.startDate}, ${p.endDate}, ${p.status}, ${p.highlight})
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          discount_type = EXCLUDED.discount_type,
          discount_value = EXCLUDED.discount_value,
          package_id = EXCLUDED.package_id,
          code = EXCLUDED.code,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          status = EXCLUDED.status,
          highlight = EXCLUDED.highlight
      `;
    }

    await syncIds(
      tx,
      "members",
      data.members.map((m) => m.id)
    );
    for (const m of data.members) {
      await tx`
        INSERT INTO members (id, name, email, phone, package_id, joined_at, expires_at, status)
        VALUES (${m.id}, ${m.name}, ${m.email}, ${m.phone}, ${m.packageId}, ${m.joinedAt}, ${m.expiresAt}, ${m.status})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          package_id = EXCLUDED.package_id,
          joined_at = EXCLUDED.joined_at,
          expires_at = EXCLUDED.expires_at,
          status = EXCLUDED.status
      `;
    }

    await syncIds(
      tx,
      "facilities",
      data.facilities.map((f) => f.id)
    );
    for (const f of data.facilities) {
      await tx`
        INSERT INTO facilities (id, name, type, capacity, status)
        VALUES (${f.id}, ${f.name}, ${f.type}, ${f.capacity}, ${f.status})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          capacity = EXCLUDED.capacity,
          status = EXCLUDED.status
      `;
    }

    const renewals = data.membershipRenewals ?? [];
    const memberIds = data.members.map((m) => m.id);
    if (memberIds.length === 0) {
      await tx`DELETE FROM membership_renewals`;
    } else {
      await tx.unsafe(
        `DELETE FROM membership_renewals WHERE member_id NOT IN (${memberIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})`
      );
    }
    for (const r of renewals) {
      await tx`
        INSERT INTO membership_renewals (
          id, member_id, member_name, package_id, package_name,
          previous_expires_at, new_expires_at, original_price, final_price,
          promotion_id, promotion_title, renewed_at, renewed_by
        )
        VALUES (
          ${r.id}, ${r.memberId}, ${r.memberName}, ${r.packageId}, ${r.packageName},
          ${r.previousExpiresAt}, ${r.newExpiresAt}, ${r.originalPrice}, ${r.finalPrice},
          ${r.promotionId}, ${r.promotionTitle}, ${r.renewedAt}, ${r.renewedBy}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }

    await syncIds(
      tx,
      "bookings",
      data.bookings.map((b) => b.id)
    );
    for (const b of data.bookings) {
      await tx`
        INSERT INTO bookings (id, type, member_id, resource_id, resource_name, date, time, status, notes)
        VALUES (${b.id}, ${b.type}, ${b.memberId}, ${b.resourceId}, ${b.resourceName}, ${b.date}, ${b.time}, ${b.status}, ${b.notes ?? null})
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          member_id = EXCLUDED.member_id,
          resource_id = EXCLUDED.resource_id,
          resource_name = EXCLUDED.resource_name,
          date = EXCLUDED.date,
          time = EXCLUDED.time,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes
      `;
    }

    await syncIds(
      tx,
      "sales",
      data.sales.map((s) => s.id)
    );
    for (const s of data.sales) {
      await tx`
        INSERT INTO sales (id, member_id, member_name, item, amount, date, type, original_amount, promotion_id)
        VALUES (${s.id}, ${s.memberId}, ${s.memberName}, ${s.item}, ${s.amount}, ${s.date}, ${s.type}, ${s.originalAmount ?? null}, ${s.promotionId ?? null})
        ON CONFLICT (id) DO UPDATE SET
          member_id = EXCLUDED.member_id,
          member_name = EXCLUDED.member_name,
          item = EXCLUDED.item,
          amount = EXCLUDED.amount,
          date = EXCLUDED.date,
          type = EXCLUDED.type,
          original_amount = EXCLUDED.original_amount,
          promotion_id = EXCLUDED.promotion_id
      `;
    }
  });
}

export async function getOrInitAppData(): Promise<AppData> {
  const data = await withDb(async (sql) => {
    await ensureSchema(sql);
    const empty = await isDatabaseEmpty(sql);
    if (empty) {
      await saveAppData(initialData, sql);
      return initialData;
    }
    return loadAppData(sql);
  });

  const { seedDefaultUsers } = await import("./users");
  await seedDefaultUsers();

  return data;
}

/** บันทึกพร้อม merge ข้อมูลจาก DB ก่อน — ป้องกัน booking/renewal จาก portal หาย */
export async function persistAppData(data: AppData): Promise<void> {
  return withDb(async (sql) => {
    await ensureSchema(sql);
    const existing = await loadAppData(sql);
    const merged: AppData = {
      ...data,
      bookings: mergeById(existing.bookings, data.bookings),
      membershipRenewals: mergeRenewals(
        existing.membershipRenewals,
        data.membershipRenewals ?? []
      ),
    };
    await saveAppData(merged, sql);
  });
}
