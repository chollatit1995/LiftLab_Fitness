import { Booking, BookingType, FitnessClass } from "./types";
import { todayISO } from "./dates";

/** ช่วงเวลามาตรฐานสำหรับจอง PT */
export const TRAINER_TIME_SLOTS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

const DEFAULT_CLASS_SLOTS = ["07:00", "09:00", "10:00", "17:00", "18:00"];

/** ดึงเวลาจากข้อความตารางคลาส เช่น "จ-ศ 18:00" */
export function parseTimesFromSchedule(schedule: string): string[] {
  const matches = schedule.match(/\d{1,2}:\d{2}/g) ?? [];
  const normalized = matches.map((t) => {
    const [h, m] = t.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  });
  return [...new Set(normalized)].sort();
}

export function classTimeSlots(fitnessClass: Pick<FitnessClass, "schedule">): string[] {
  const parsed = parseTimesFromSchedule(fitnessClass.schedule);
  return parsed.length > 0 ? parsed : DEFAULT_CLASS_SLOTS;
}

/** จองล่วงหน้าได้กี่วัน (วันนี้รวมอยู่ด้วย) */
export const BOOKING_HORIZON_DAYS = 60;

/** วันที่เลือกได้สำหรับจอง (เริ่มจากวันนี้) */
export function upcomingDates(
  count = BOOKING_HORIZON_DAYS,
  from = todayISO()
): string[] {
  const start = new Date(from + "T12:00:00");
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** ตัดวันที่ให้ไม่เกินวันหมดอายุแพ็กเกจ (ถ้ามี) */
export function bookableDates(
  expiresAt?: string | null,
  count = BOOKING_HORIZON_DAYS
): string[] {
  const dates = upcomingDates(count);
  if (!expiresAt) return dates;
  const max = expiresAt.slice(0, 10);
  return dates.filter((d) => d <= max);
}

export function weekdayLabel(dateStr: string): string {
  const iso = dateStr.slice(0, 10);
  return new Intl.DateTimeFormat("th-TH", { weekday: "short" }).format(
    new Date(iso + "T12:00:00")
  );
}

export function dayNumber(dateStr: string): string {
  return dateStr.slice(8, 10);
}

/** เดือน + ปี สำหรับหัวข้อเลือกวันที่ (เช่น สิงหาคม 2569) */
export function monthYearLabel(dateStr: string): string {
  const iso = dateStr.slice(0, 10);
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(new Date(iso + "T12:00:00"));
}

/** ชื่อเดือนย่อบนการ์ดวันที่ (เช่น ส.ค.) */
export function dateCardMonth(dateStr: string): string {
  const iso = dateStr.slice(0, 10);
  return new Intl.DateTimeFormat("th-TH", { month: "short" }).format(
    new Date(iso + "T12:00:00")
  );
}

/** ตรวจว่า slot วัน+เวลานี้ผ่านมาแล้วหรือไม่ (ใช้เวลา local) */
export function isSlotInPast(
  date: string,
  time: string,
  now: Date = new Date()
): boolean {
  const iso = date.slice(0, 10);
  const today = todayISO();
  if (iso < today) return true;
  if (iso > today) return false;

  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const slotMins = h * 60 + m;
  return slotMins <= nowMins;
}

/** จัดกลุ่มวันที่ตามเดือน — สำหรับแสดงหัวเดือนแบบเว็บสายการบิน */
export function groupDatesByMonth(
  dates: string[]
): { monthKey: string; label: string; dates: string[] }[] {
  const groups: { monthKey: string; label: string; dates: string[] }[] = [];
  for (const d of dates) {
    const monthKey = d.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.monthKey === monthKey) {
      last.dates.push(d);
    } else {
      groups.push({ monthKey, label: monthYearLabel(d), dates: [d] });
    }
  }
  return groups;
}

export function countSlotBookings(
  bookings: Pick<Booking, "resourceId" | "date" | "time" | "status">[],
  resourceId: string,
  date: string,
  time: string
): number {
  return bookings.filter(
    (b) =>
      b.resourceId === resourceId &&
      b.date === date &&
      b.time === time &&
      b.status === "confirmed"
  ).length;
}

export function isTrainerSlotTaken(
  bookings: Pick<Booking, "resourceId" | "date" | "time" | "status">[],
  trainerId: string,
  date: string,
  time: string
): boolean {
  return countSlotBookings(bookings, trainerId, date, time) > 0;
}

export function classSlotAvailability(
  bookings: Pick<Booking, "resourceId" | "date" | "time" | "status">[],
  classId: string,
  date: string,
  time: string,
  capacity: number
): { booked: number; remaining: number; full: boolean } {
  const booked = countSlotBookings(bookings, classId, date, time);
  const remaining = Math.max(0, capacity - booked);
  return { booked, remaining, full: remaining <= 0 };
}

export function memberAlreadyBooked(
  bookings: Pick<Booking, "memberId" | "resourceId" | "date" | "time" | "status">[],
  memberId: string,
  resourceId: string,
  date: string,
  time: string
): boolean {
  return bookings.some(
    (b) =>
      b.memberId === memberId &&
      b.resourceId === resourceId &&
      b.date === date &&
      b.time === time &&
      b.status === "confirmed"
  );
}

export function slotsForType(
  type: BookingType,
  fitnessClass?: Pick<FitnessClass, "schedule">
): string[] {
  if (type === "trainer") return TRAINER_TIME_SLOTS;
  if (type === "class" && fitnessClass) return classTimeSlots(fitnessClass);
  return TRAINER_TIME_SLOTS;
}

export function bookingTypeMeta(type: BookingType) {
  switch (type) {
    case "class":
      return {
        icon: "fitness_center",
        label: "คลาส",
        labelEn: "Class",
        gradient: "from-violet-500 to-purple-600",
        bg: "bg-violet-50",
        text: "text-violet-700",
      };
    case "trainer":
      return {
        icon: "person",
        label: "เทรนเนอร์ (PT)",
        labelEn: "Personal Training",
        gradient: "from-brand-600 to-emerald-500",
        bg: "bg-brand-50",
        text: "text-brand-700",
      };
    case "facility":
      return {
        icon: "meeting_room",
        label: "พื้นที่",
        labelEn: "Facility",
        gradient: "from-sky-500 to-blue-600",
        bg: "bg-sky-50",
        text: "text-sky-700",
      };
  }
}
