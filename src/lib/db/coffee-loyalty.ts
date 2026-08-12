import {
  CoffeeLoyalty,
  CoffeeLoyaltyEvent,
  CoffeeMemberSummary,
  STAMPS_PER_FREE,
  canRedeemFree,
} from "../coffee-loyalty";
import { toISODate } from "../dates";
import { withDb } from "./client";

function mapLoyalty(row: Record<string, unknown>): CoffeeLoyalty {
  return {
    memberId: row.member_id as string,
    stamps: Number(row.stamps ?? 0),
    totalStamps: Number(row.total_stamps ?? 0),
    freeRedeemed: Number(row.free_redeemed ?? 0),
    updatedAt: toISODate(row.updated_at) || new Date().toISOString(),
  };
}

function mapEvent(row: Record<string, unknown>): CoffeeLoyaltyEvent {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    eventType: row.event_type as CoffeeLoyaltyEvent["eventType"],
    stampsAfter: Number(row.stamps_after ?? 0),
    staffName: (row.staff_name as string | null) ?? null,
    createdAt: toISODate(row.created_at) || new Date().toISOString(),
  };
}

function generateEventId() {
  return `cf${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function getOrCreateLoyalty(
  memberId: string
): Promise<CoffeeLoyalty | null> {
  return withDb(async (sql) => {
    const existing = await sql`
      SELECT member_id, stamps, total_stamps, free_redeemed, updated_at
      FROM coffee_loyalty
      WHERE member_id = ${memberId}
      LIMIT 1
    `;
    if (existing.length > 0) return mapLoyalty(existing[0]);

    const member = await sql`
      SELECT id FROM members WHERE id = ${memberId} LIMIT 1
    `;
    if (member.length === 0) return null;

    const rows = await sql`
      INSERT INTO coffee_loyalty (member_id, stamps, total_stamps, free_redeemed)
      VALUES (${memberId}, 0, 0, 0)
      ON CONFLICT (member_id) DO NOTHING
      RETURNING member_id, stamps, total_stamps, free_redeemed, updated_at
    `;
    if (rows.length > 0) return mapLoyalty(rows[0]);

    const again = await sql`
      SELECT member_id, stamps, total_stamps, free_redeemed, updated_at
      FROM coffee_loyalty
      WHERE member_id = ${memberId}
      LIMIT 1
    `;
    return again.length > 0 ? mapLoyalty(again[0]) : null;
  });
}

export async function getLoyaltyEvents(
  memberId: string,
  limit = 8
): Promise<CoffeeLoyaltyEvent[]> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT id, member_id, event_type, stamps_after, staff_name, created_at
      FROM coffee_loyalty_events
      WHERE member_id = ${memberId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map(mapEvent);
  });
}

export async function searchMembersForCoffee(
  query: string
): Promise<CoffeeMemberSummary[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return withDb(async (sql) => {
    const pattern = `%${q}%`;
    const rows = await sql`
      SELECT m.id, m.name, m.email, m.phone, m.status,
             COALESCE(cl.stamps, 0) AS stamps,
             COALESCE(cl.total_stamps, 0) AS total_stamps,
             COALESCE(cl.free_redeemed, 0) AS free_redeemed,
             cl.updated_at
      FROM members m
      LEFT JOIN coffee_loyalty cl ON cl.member_id = m.id
      WHERE LOWER(m.name) LIKE ${pattern}
         OR LOWER(m.email) LIKE ${pattern}
         OR REPLACE(m.phone, '-', '') LIKE ${pattern.replace(/-/g, "")}
      ORDER BY m.name
      LIMIT 12
    `;

    return rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      phone: row.phone as string,
      status: row.status as string,
      loyalty: {
        memberId: row.id as string,
        stamps: Number(row.stamps ?? 0),
        totalStamps: Number(row.total_stamps ?? 0),
        freeRedeemed: Number(row.free_redeemed ?? 0),
        updatedAt: toISODate(row.updated_at) || new Date().toISOString(),
      },
    }));
  });
}

export async function addCoffeeStamp(
  memberId: string,
  staffName: string
): Promise<
  | { ok: true; loyalty: CoffeeLoyalty; event: CoffeeLoyaltyEvent; readyToRedeem: boolean }
  | { ok: false; error: string }
> {
  return withDb(async (sql) => {
    const member = await sql`
      SELECT id, status FROM members WHERE id = ${memberId} LIMIT 1
    `;
    if (member.length === 0) return { ok: false, error: "ไม่พบสมาชิก" };
    if (member[0].status !== "active") {
      return { ok: false, error: "สมาชิกไม่ได้อยู่ในสถานะใช้งาน" };
    }

    await sql`
      INSERT INTO coffee_loyalty (member_id, stamps, total_stamps, free_redeemed)
      VALUES (${memberId}, 0, 0, 0)
      ON CONFLICT (member_id) DO NOTHING
    `;

    const updated = await sql`
      UPDATE coffee_loyalty
      SET stamps = stamps + 1,
          total_stamps = total_stamps + 1,
          updated_at = NOW()
      WHERE member_id = ${memberId}
      RETURNING member_id, stamps, total_stamps, free_redeemed, updated_at
    `;

    const loyalty = mapLoyalty(updated[0]);
    const eventId = generateEventId();
    const eventRows = await sql`
      INSERT INTO coffee_loyalty_events (id, member_id, event_type, stamps_after, staff_name)
      VALUES (${eventId}, ${memberId}, 'stamp', ${loyalty.stamps}, ${staffName})
      RETURNING id, member_id, event_type, stamps_after, staff_name, created_at
    `;

    return {
      ok: true,
      loyalty,
      event: mapEvent(eventRows[0]),
      readyToRedeem: canRedeemFree(loyalty.stamps),
    };
  });
}

export async function redeemFreeCoffee(
  memberId: string,
  staffName: string
): Promise<
  | { ok: true; loyalty: CoffeeLoyalty; event: CoffeeLoyaltyEvent }
  | { ok: false; error: string }
> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT member_id, stamps, total_stamps, free_redeemed, updated_at
      FROM coffee_loyalty
      WHERE member_id = ${memberId}
      LIMIT 1
    `;
    if (rows.length === 0 || Number(rows[0].stamps) < STAMPS_PER_FREE) {
      return { ok: false, error: `ต้องสะสมครบ ${STAMPS_PER_FREE} แก้วก่อนแลกฟรี` };
    }

    const updated = await sql`
      UPDATE coffee_loyalty
      SET stamps = stamps - ${STAMPS_PER_FREE},
          free_redeemed = free_redeemed + 1,
          updated_at = NOW()
      WHERE member_id = ${memberId}
        AND stamps >= ${STAMPS_PER_FREE}
      RETURNING member_id, stamps, total_stamps, free_redeemed, updated_at
    `;

    if (updated.length === 0) {
      return { ok: false, error: "แลกฟรีไม่สำเร็จ กรุณาลองใหม่" };
    }

    const loyalty = mapLoyalty(updated[0]);
    const eventId = generateEventId();
    const eventRows = await sql`
      INSERT INTO coffee_loyalty_events (id, member_id, event_type, stamps_after, staff_name)
      VALUES (${eventId}, ${memberId}, 'redeem', ${loyalty.stamps}, ${staffName})
      RETURNING id, member_id, event_type, stamps_after, staff_name, created_at
    `;

    return {
      ok: true,
      loyalty,
      event: mapEvent(eventRows[0]),
    };
  });
}
