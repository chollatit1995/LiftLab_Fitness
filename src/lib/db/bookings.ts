import { BookingType } from "../types";
import { hasSessionQuota, sessionsRemaining } from "../sessions";
import { toISODate, todayISO } from "../dates";
import {
  classSlotAvailability,
  isSlotInPast,
  isTrainerSlotTaken,
  memberAlreadyBooked,
} from "../bookings";
import { withDb } from "./client";

export interface BookingCatalogClass {
  id: string;
  name: string;
  description: string;
  trainerId: string;
  trainerName: string;
  capacity: number;
  duration: number;
  schedule: string;
  price: number;
}

export interface BookingCatalogTrainer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface BookingCatalogSlot {
  resourceId: string;
  date: string;
  time: string;
  status: string;
  memberId: string;
}

export interface BookingCatalog {
  classes: BookingCatalogClass[];
  trainers: BookingCatalogTrainer[];
  confirmedSlots: BookingCatalogSlot[];
}

export async function loadBookingCatalog(): Promise<BookingCatalog> {
  return withDb(async (sql) => {
    const classRows = await sql`
      SELECT c.id, c.name, c.description, c.trainer_id, c.capacity, c.duration,
             c.schedule, c.price, s.name AS trainer_name
      FROM fitness_classes c
      LEFT JOIN staff s ON s.id = c.trainer_id
      WHERE c.status = 'active'
      ORDER BY c.name
    `;
    const trainerRows = await sql`
      SELECT id, name, email, phone
      FROM staff
      WHERE role = 'trainer' AND status = 'active'
      ORDER BY name
    `;
    const slotRows = await sql`
      SELECT resource_id, date, time, status, member_id
      FROM bookings
      WHERE status = 'confirmed' AND date >= ${todayISO()}::date
    `;

    return {
      classes: classRows.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        description: r.description as string,
        trainerId: r.trainer_id as string,
        trainerName: (r.trainer_name as string) ?? "—",
        capacity: Number(r.capacity),
        duration: Number(r.duration),
        schedule: r.schedule as string,
        price: Number(r.price),
      })),
      trainers: trainerRows.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        email: r.email as string,
        phone: r.phone as string,
      })),
      confirmedSlots: slotRows.map((r) => ({
        resourceId: r.resource_id as string,
        date: toISODate(r.date),
        time: r.time as string,
        status: r.status as string,
        memberId: r.member_id as string,
      })),
    };
  });
}

export type CreateBookingResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createMemberBooking(input: {
  memberId: string;
  type: BookingType;
  resourceId: string;
  resourceName: string;
  date: string;
  time: string;
  notes?: string;
}): Promise<CreateBookingResult> {
  return withDb(async (sql) => {
    const memberRows = await sql`
      SELECT status, expires_at, sessions_total, sessions_used
      FROM members WHERE id = ${input.memberId} LIMIT 1
    `;
    if (memberRows.length === 0) {
      return { ok: false, error: "ไม่พบข้อมูลสมาชิก" };
    }
    const member = memberRows[0];
    if (member.status !== "active") {
      return { ok: false, error: "สมาชิกไม่ได้อยู่ในสถานะใช้งาน" };
    }
    const expiresAt = toISODate(member.expires_at);
    if (expiresAt && expiresAt < todayISO()) {
      return { ok: false, error: "แพ็กเกจหมดอายุแล้ว กรุณาต่ออายุก่อนจอง" };
    }
    if (input.date < todayISO()) {
      return { ok: false, error: "ไม่สามารถจองวันที่ผ่านมาแล้ว" };
    }
    if (isSlotInPast(input.date, input.time)) {
      return { ok: false, error: "ไม่สามารถจองเวลาที่ผ่านมาแล้ว" };
    }

    const existingRows = await sql`
      SELECT member_id, resource_id, date, time, status
      FROM bookings
      WHERE status = 'confirmed' AND date >= ${todayISO()}::date
    `;
    const existing = existingRows.map((r) => ({
      memberId: r.member_id as string,
      resourceId: r.resource_id as string,
      date: toISODate(r.date),
      time: r.time as string,
      status: r.status as "confirmed" | "cancelled" | "completed",
    }));

    if (
      memberAlreadyBooked(
        existing,
        input.memberId,
        input.resourceId,
        input.date,
        input.time
      )
    ) {
      return { ok: false, error: "คุณจองรายการนี้ไว้แล้ว" };
    }

    if (input.type === "trainer") {
      const sessionsTotal =
        member.sessions_total != null ? Number(member.sessions_total) : null;
      const sessionsUsed = Number(member.sessions_used ?? 0);
      if (hasSessionQuota(sessionsTotal)) {
        const trainerBookings = await sql`
          SELECT id FROM bookings
          WHERE member_id = ${input.memberId}
            AND type = 'trainer'
            AND status = 'confirmed'
        `;
        const remaining = sessionsRemaining(sessionsTotal, sessionsUsed);
        if (remaining != null && trainerBookings.length >= remaining) {
          return {
            ok: false,
            error: "ใช้ครั้งเทรนครบแล้ว กรุณาต่ออายุหรือติดต่อเคาน์เตอร์",
          };
        }
      }

      if (isTrainerSlotTaken(existing, input.resourceId, input.date, input.time)) {
        return { ok: false, error: "เทรนเนอร์ไม่ว่างในช่วงเวลานี้" };
      }
    }

    if (input.type === "class") {
      const classRows = await sql`
        SELECT capacity FROM fitness_classes
        WHERE id = ${input.resourceId} AND status = 'active'
        LIMIT 1
      `;
      if (classRows.length === 0) {
        return { ok: false, error: "ไม่พบคลาสที่เลือก" };
      }
      const capacity = Number(classRows[0].capacity);
      const availability = classSlotAvailability(
        existing,
        input.resourceId,
        input.date,
        input.time,
        capacity
      );
      if (availability.full) {
        return { ok: false, error: "คลาสเต็มแล้วในช่วงเวลานี้" };
      }
    }

    const id = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await sql`
      INSERT INTO bookings (id, type, member_id, resource_id, resource_name, date, time, status, notes)
      VALUES (
        ${id}, ${input.type}, ${input.memberId}, ${input.resourceId},
        ${input.resourceName}, ${input.date}, ${input.time}, 'confirmed', ${input.notes ?? null}
      )
    `;
    return { ok: true, id };
  });
}

export async function cancelMemberBooking(
  memberId: string,
  bookingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withDb(async (sql) => {
    const rows = await sql`
      UPDATE bookings
      SET status = 'cancelled'
      WHERE id = ${bookingId} AND member_id = ${memberId} AND status = 'confirmed'
      RETURNING id
    `;
    if (rows.length === 0) {
      return { ok: false, error: "ไม่พบการจองหรือยกเลิกไม่ได้" };
    }
    return { ok: true };
  });
}
