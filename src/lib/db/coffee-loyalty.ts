import {
  CoffeeLoyalty,
  CoffeeLoyaltyEvent,
  CoffeeMemberSummary,
  CoffeeRequestType,
  CoffeeStampRequest,
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

function mapRequest(row: Record<string, unknown>): CoffeeStampRequest {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    memberName: (row.member_name as string) ?? "",
    memberEmail: (row.member_email as string) ?? "",
    memberPhone: (row.member_phone as string) ?? "",
    requestType: row.request_type as CoffeeRequestType,
    status: row.status as CoffeeStampRequest["status"],
    stampsSnapshot: Number(row.stamps_snapshot ?? 0),
    staffName: (row.staff_name as string | null) ?? null,
    createdAt: toISODate(row.created_at) || new Date().toISOString(),
    resolvedAt: row.resolved_at ? toISODate(row.resolved_at) : null,
  };
}

function generateId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function ensureLoyaltyRow(
  sql: ReturnType<typeof import("postgres")>,
  memberId: string
) {
  await sql`
    INSERT INTO coffee_loyalty (member_id, stamps, total_stamps, free_redeemed)
    VALUES (${memberId}, 0, 0, 0)
    ON CONFLICT (member_id) DO NOTHING
  `;
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

    await ensureLoyaltyRow(sql, memberId);

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

export async function getMemberPendingRequest(
  memberId: string
): Promise<CoffeeStampRequest | null> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT r.id, r.member_id, r.request_type, r.status, r.stamps_snapshot,
             r.staff_name, r.created_at, r.resolved_at,
             m.name AS member_name, m.email AS member_email, m.phone AS member_phone
      FROM coffee_stamp_requests r
      JOIN members m ON m.id = r.member_id
      WHERE r.member_id = ${memberId}
        AND r.status = 'pending'
      ORDER BY r.created_at DESC
      LIMIT 1
    `;
    return rows.length > 0 ? mapRequest(rows[0]) : null;
  });
}

export async function getMemberRecentRequests(
  memberId: string,
  limit = 8
): Promise<CoffeeStampRequest[]> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT r.id, r.member_id, r.request_type, r.status, r.stamps_snapshot,
             r.staff_name, r.created_at, r.resolved_at,
             m.name AS member_name, m.email AS member_email, m.phone AS member_phone
      FROM coffee_stamp_requests r
      JOIN members m ON m.id = r.member_id
      WHERE r.member_id = ${memberId}
      ORDER BY r.created_at DESC
      LIMIT ${limit}
    `;
    return rows.map(mapRequest);
  });
}

export async function createStampRequest(
  memberId: string,
  requestType: CoffeeRequestType = "stamp"
): Promise<
  | { ok: true; request: CoffeeStampRequest }
  | { ok: false; error: string }
> {
  return withDb(async (sql) => {
    const member = await sql`
      SELECT id, name, email, phone, status
      FROM members
      WHERE id = ${memberId}
      LIMIT 1
    `;
    if (member.length === 0) return { ok: false, error: "ไม่พบสมาชิก" };
    if (member[0].status !== "active") {
      return { ok: false, error: "สมาชิกไม่ได้อยู่ในสถานะใช้งาน" };
    }

    const pending = await sql`
      SELECT id FROM coffee_stamp_requests
      WHERE member_id = ${memberId} AND status = 'pending'
      LIMIT 1
    `;
    if (pending.length > 0) {
      return {
        ok: false,
        error: "มีคำขอที่รอพนักงานยืนยันอยู่แล้ว กรุณารอสักครู่",
      };
    }

    await ensureLoyaltyRow(sql, memberId);
    const loyaltyRows = await sql`
      SELECT stamps FROM coffee_loyalty WHERE member_id = ${memberId} LIMIT 1
    `;
    const stamps = Number(loyaltyRows[0]?.stamps ?? 0);

    if (requestType === "redeem" && stamps < STAMPS_PER_FREE) {
      return {
        ok: false,
        error: `ต้องสะสมครบ ${STAMPS_PER_FREE} แก้วก่อนขอแลกฟรี`,
      };
    }

    const id = generateId("cr");
    const rows = await sql`
      INSERT INTO coffee_stamp_requests
        (id, member_id, request_type, status, stamps_snapshot)
      VALUES (${id}, ${memberId}, ${requestType}, 'pending', ${stamps})
      RETURNING id, member_id, request_type, status, stamps_snapshot,
                staff_name, created_at, resolved_at
    `;

    return {
      ok: true,
      request: mapRequest({
        ...rows[0],
        member_name: member[0].name,
        member_email: member[0].email,
        member_phone: member[0].phone,
      }),
    };
  });
}

export async function listPendingRequests(): Promise<CoffeeStampRequest[]> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT r.id, r.member_id, r.request_type, r.status, r.stamps_snapshot,
             r.staff_name, r.created_at, r.resolved_at,
             m.name AS member_name, m.email AS member_email, m.phone AS member_phone
      FROM coffee_stamp_requests r
      JOIN members m ON m.id = r.member_id
      WHERE r.status = 'pending'
      ORDER BY r.created_at ASC
      LIMIT 50
    `;
    return rows.map(mapRequest);
  });
}

export async function confirmStampRequest(
  requestId: string,
  staffName: string
): Promise<
  | {
      ok: true;
      request: CoffeeStampRequest;
      loyalty: CoffeeLoyalty;
      event: CoffeeLoyaltyEvent;
      readyToRedeem: boolean;
    }
  | { ok: false; error: string }
> {
  return withDb(async (sql) => {
    const requestRows = await sql`
      SELECT r.id, r.member_id, r.request_type, r.status, r.stamps_snapshot,
             r.staff_name, r.created_at, r.resolved_at,
             m.name AS member_name, m.email AS member_email, m.phone AS member_phone,
             m.status AS member_status
      FROM coffee_stamp_requests r
      JOIN members m ON m.id = r.member_id
      WHERE r.id = ${requestId}
      LIMIT 1
    `;
    if (requestRows.length === 0) return { ok: false, error: "ไม่พบคำขอ" };
    const req = requestRows[0];
    if (req.status !== "pending") {
      return { ok: false, error: "คำขอนี้ถูกดำเนินการแล้ว" };
    }
    if (req.member_status !== "active") {
      return { ok: false, error: "สมาชิกไม่ได้อยู่ในสถานะใช้งาน" };
    }

    const memberId = req.member_id as string;
    const requestType = req.request_type as CoffeeRequestType;

    await ensureLoyaltyRow(sql, memberId);

    let loyaltyRows;
    if (requestType === "redeem") {
      loyaltyRows = await sql`
        UPDATE coffee_loyalty
        SET stamps = stamps - ${STAMPS_PER_FREE},
            free_redeemed = free_redeemed + 1,
            updated_at = NOW()
        WHERE member_id = ${memberId}
          AND stamps >= ${STAMPS_PER_FREE}
        RETURNING member_id, stamps, total_stamps, free_redeemed, updated_at
      `;
      if (loyaltyRows.length === 0) {
        return {
          ok: false,
          error: `สมาชิกยังสะสมไม่ครบ ${STAMPS_PER_FREE} แก้ว`,
        };
      }
    } else {
      loyaltyRows = await sql`
        UPDATE coffee_loyalty
        SET stamps = stamps + 1,
            total_stamps = total_stamps + 1,
            updated_at = NOW()
        WHERE member_id = ${memberId}
        RETURNING member_id, stamps, total_stamps, free_redeemed, updated_at
      `;
    }

    const loyalty = mapLoyalty(loyaltyRows[0]);
    const eventId = generateId("cf");
    const eventType = requestType === "redeem" ? "redeem" : "stamp";
    const eventRows = await sql`
      INSERT INTO coffee_loyalty_events (id, member_id, event_type, stamps_after, staff_name)
      VALUES (${eventId}, ${memberId}, ${eventType}, ${loyalty.stamps}, ${staffName})
      RETURNING id, member_id, event_type, stamps_after, staff_name, created_at
    `;

    const updatedReq = await sql`
      UPDATE coffee_stamp_requests
      SET status = 'confirmed',
          staff_name = ${staffName},
          resolved_at = NOW()
      WHERE id = ${requestId}
        AND status = 'pending'
      RETURNING id, member_id, request_type, status, stamps_snapshot,
                staff_name, created_at, resolved_at
    `;

    if (updatedReq.length === 0) {
      return { ok: false, error: "ยืนยันไม่สำเร็จ กรุณาลองใหม่" };
    }

    return {
      ok: true,
      request: mapRequest({
        ...updatedReq[0],
        member_name: req.member_name,
        member_email: req.member_email,
        member_phone: req.member_phone,
      }),
      loyalty,
      event: mapEvent(eventRows[0]),
      readyToRedeem: canRedeemFree(loyalty.stamps),
    };
  });
}

export async function rejectStampRequest(
  requestId: string,
  staffName: string
): Promise<{ ok: true; request: CoffeeStampRequest } | { ok: false; error: string }> {
  return withDb(async (sql) => {
    const current = await sql`
      SELECT r.id, r.member_id, r.request_type, r.status, r.stamps_snapshot,
             r.staff_name, r.created_at, r.resolved_at,
             m.name AS member_name, m.email AS member_email, m.phone AS member_phone
      FROM coffee_stamp_requests r
      JOIN members m ON m.id = r.member_id
      WHERE r.id = ${requestId}
      LIMIT 1
    `;
    if (current.length === 0) return { ok: false, error: "ไม่พบคำขอ" };
    if (current[0].status !== "pending") {
      return { ok: false, error: "คำขอนี้ถูกดำเนินการแล้ว" };
    }

    const rows = await sql`
      UPDATE coffee_stamp_requests
      SET status = 'rejected',
          staff_name = ${staffName},
          resolved_at = NOW()
      WHERE id = ${requestId}
        AND status = 'pending'
      RETURNING id, member_id, request_type, status, stamps_snapshot,
                staff_name, created_at, resolved_at
    `;
    if (rows.length === 0) {
      return { ok: false, error: "ปฏิเสธไม่สำเร็จ กรุณาลองใหม่" };
    }

    return {
      ok: true,
      request: mapRequest({
        ...rows[0],
        member_name: current[0].member_name,
        member_email: current[0].member_email,
        member_phone: current[0].member_phone,
      }),
    };
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

/** สำรอง: พนักงานกดสะสมเองโดยไม่ผ่านคำขอสมาชิก */
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

    await ensureLoyaltyRow(sql, memberId);

    const updated = await sql`
      UPDATE coffee_loyalty
      SET stamps = stamps + 1,
          total_stamps = total_stamps + 1,
          updated_at = NOW()
      WHERE member_id = ${memberId}
      RETURNING member_id, stamps, total_stamps, free_redeemed, updated_at
    `;

    const loyalty = mapLoyalty(updated[0]);
    const eventId = generateId("cf");
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
    const eventId = generateId("cf");
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
