import { AppData } from "../types";
import { initialData } from "../store";
import { SCHEMA_STATEMENTS } from "./schema";
import { getSql } from "./client";

export { isDbConfigured, getDatabaseUrl } from "./client";

export async function ensureSchema(): Promise<void> {
  const sql = getSql();
  for (const statement of SCHEMA_STATEMENTS) {
    await sql.unsafe(statement);
  }
}

export async function isDatabaseEmpty(): Promise<boolean> {
  const sql = getSql();
  const result = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM staff
  `;
  return result[0]?.count === 0;
}

export async function loadAppData(): Promise<AppData> {
  const sql = getSql();

  const [staff, classes, packages, members, facilities, bookings, sales] =
    await Promise.all([
      sql`SELECT id, name, email, phone, role, status, joined_at FROM staff ORDER BY joined_at`,
      sql`SELECT id, name, description, trainer_id, capacity, duration, schedule, price, status FROM fitness_classes ORDER BY name`,
      sql`SELECT id, name, description, price, duration_days, features, status, popular FROM membership_packages ORDER BY price`,
      sql`SELECT id, name, email, phone, package_id, joined_at, expires_at, status FROM members ORDER BY joined_at DESC`,
      sql`SELECT id, name, type, capacity, status FROM facilities ORDER BY name`,
      sql`SELECT id, type, member_id, resource_id, resource_name, date, time, status, notes FROM bookings ORDER BY date DESC, time DESC`,
      sql`SELECT id, member_id, member_name, item, amount, date, type FROM sales ORDER BY date DESC`,
    ]);

  return {
    staff: staff.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      email: r.email as string,
      phone: r.phone as string,
      role: r.role as AppData["staff"][0]["role"],
      status: r.status as AppData["staff"][0]["status"],
      joinedAt: String(r.joined_at).slice(0, 10),
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
    members: members.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      email: r.email as string,
      phone: r.phone as string,
      packageId: r.package_id as string,
      joinedAt: String(r.joined_at).slice(0, 10),
      expiresAt: String(r.expires_at).slice(0, 10),
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
      date: String(r.date).slice(0, 10),
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
      date: String(r.date).slice(0, 10),
      type: r.type as AppData["sales"][0]["type"],
    })),
  };
}

export async function saveAppData(data: AppData): Promise<void> {
  const sql = getSql();

  await sql.begin(async (tx) => {
    await tx`DELETE FROM sales`;
    await tx`DELETE FROM bookings`;
    await tx`DELETE FROM members`;
    await tx`DELETE FROM fitness_classes`;
    await tx`DELETE FROM membership_packages`;
    await tx`DELETE FROM facilities`;
    await tx`DELETE FROM staff`;

    for (const s of data.staff) {
      await tx`
        INSERT INTO staff (id, name, email, phone, role, status, joined_at)
        VALUES (${s.id}, ${s.name}, ${s.email}, ${s.phone}, ${s.role}, ${s.status}, ${s.joinedAt})
      `;
    }

    for (const c of data.classes) {
      await tx`
        INSERT INTO fitness_classes (id, name, description, trainer_id, capacity, duration, schedule, price, status)
        VALUES (${c.id}, ${c.name}, ${c.description}, ${c.trainerId}, ${c.capacity}, ${c.duration}, ${c.schedule}, ${c.price}, ${c.status})
      `;
    }

    for (const p of data.packages) {
      await tx`
        INSERT INTO membership_packages (id, name, description, price, duration_days, features, status, popular)
        VALUES (${p.id}, ${p.name}, ${p.description}, ${p.price}, ${p.durationDays}, ${tx.json(p.features)}, ${p.status}, ${p.popular ?? false})
      `;
    }

    for (const m of data.members) {
      await tx`
        INSERT INTO members (id, name, email, phone, package_id, joined_at, expires_at, status)
        VALUES (${m.id}, ${m.name}, ${m.email}, ${m.phone}, ${m.packageId}, ${m.joinedAt}, ${m.expiresAt}, ${m.status})
      `;
    }

    for (const f of data.facilities) {
      await tx`
        INSERT INTO facilities (id, name, type, capacity, status)
        VALUES (${f.id}, ${f.name}, ${f.type}, ${f.capacity}, ${f.status})
      `;
    }

    for (const b of data.bookings) {
      await tx`
        INSERT INTO bookings (id, type, member_id, resource_id, resource_name, date, time, status, notes)
        VALUES (${b.id}, ${b.type}, ${b.memberId}, ${b.resourceId}, ${b.resourceName}, ${b.date}, ${b.time}, ${b.status}, ${b.notes ?? null})
      `;
    }

    for (const s of data.sales) {
      await tx`
        INSERT INTO sales (id, member_id, member_name, item, amount, date, type)
        VALUES (${s.id}, ${s.memberId}, ${s.memberName}, ${s.item}, ${s.amount}, ${s.date}, ${s.type})
      `;
    }
  });
}

export async function seedDatabase(): Promise<AppData> {
  await saveAppData(initialData);
  return initialData;
}

export async function getOrInitAppData(): Promise<AppData> {
  await ensureSchema();
  const empty = await isDatabaseEmpty();
  if (empty) {
    return seedDatabase();
  }
  return loadAppData();
}
