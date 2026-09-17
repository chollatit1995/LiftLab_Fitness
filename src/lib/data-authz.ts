import { AppData, Booking, Member } from "./types";
import { AppUserRole } from "./user-types";
import { hasSessionQuota } from "./sessions";

export type AppDataCollection = keyof AppData;

/**
 * role ที่แก้ข้อมูลแต่ละส่วนได้ — ตรงกับหน้าที่ role นั้นเข้าถึงได้ใน NAV_ITEMS
 * หน้าเว็บซ่อนเมนูให้อยู่แล้ว ชั้นนี้บังคับเรื่องเดียวกันกับคนที่ยิง API ตรง
 */
const COLLECTION_EDITORS: Record<AppDataCollection, AppUserRole[]> = {
  // /bookings และ /members เปิดให้เทรนเนอร์ด้วย แต่ถูกจำกัดต่ออีกชั้นด้านล่าง
  // (restrictBookingsToTrainer / restrictMembersToSessionUsage)
  bookings: ["admin", "manager", "staff", "trainer"],
  members: ["admin", "manager", "staff", "trainer"],
  // ต่ออายุและยอดขายเป็นงานหน้าเคาน์เตอร์ เทรนเนอร์ดูหน้าสมาชิกได้แต่แก้ไม่ได้
  membershipRenewals: ["admin", "manager", "staff"],
  sales: ["admin", "manager", "staff"],
  // /classes เป็นหน้าหลังบ้าน
  classes: ["admin", "manager", "staff"],
  packages: ["admin", "manager", "staff"],
  // เข้าถึงได้เฉพาะผู้ดูแล/ผู้จัดการ
  promotions: ["admin", "manager"],
  staff: ["admin", "manager"],
  facilities: ["admin", "manager"],
};

export const ALL_COLLECTIONS = Object.keys(COLLECTION_EDITORS) as AppDataCollection[];

export function canEditCollection(
  role: string | null,
  collection: AppDataCollection
): boolean {
  if (!role) return false;
  return (COLLECTION_EDITORS[collection] as string[]).includes(role);
}

/** เรียงคีย์ให้คงที่ก่อนเทียบ — ลำดับคีย์/ลำดับรายการต้องไม่ทำให้ดูเหมือนมีการแก้ไข */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}

function fingerprint(items: { id: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) map.set(item.id, canonical(item));
  return map;
}

/** ส่วนไหนของข้อมูลที่ client ส่งมาต่างจากของในฐานข้อมูล */
export function changedCollections(
  current: AppData,
  incoming: AppData
): AppDataCollection[] {
  const changed: AppDataCollection[] = [];
  for (const collection of ALL_COLLECTIONS) {
    const before = fingerprint((current[collection] ?? []) as { id: string }[]);
    const after = fingerprint((incoming[collection] ?? []) as { id: string }[]);
    if (before.size !== after.size) {
      changed.push(collection);
      continue;
    }
    for (const [id, value] of after) {
      if (before.get(id) !== value) {
        changed.push(collection);
        break;
      }
    }
  }
  return changed;
}

/** ส่วนที่ถูกแก้มาแต่ role นี้ไม่มีสิทธิ์ — ต้องคืนค่าเดิมจากฐานข้อมูลแทน */
export function blockedCollections(
  role: string | null,
  current: AppData,
  incoming: AppData
): AppDataCollection[] {
  return changedCollections(current, incoming).filter(
    (collection) => !canEditCollection(role, collection)
  );
}

/**
 * ครั้ง PT ที่ยอมให้เทรนเนอร์อัปเดตได้ — เพิ่มขึ้นทีละครั้งตอนปิดคิวเท่านั้น
 * ลดกลับไม่ได้ (กันการคืนครั้งให้ลูกค้าเอง) และเกิน quota ไม่ได้
 */
function acceptedSessionsUsed(current: Member, next: Member): number {
  const used = current.sessionsUsed ?? 0;
  const proposed = next.sessionsUsed ?? 0;
  if (!hasSessionQuota(current.sessionsTotal)) return used;
  if (!Number.isInteger(proposed) || proposed <= used) return used;
  return Math.min(proposed, current.sessionsTotal as number);
}

/**
 * เทรนเนอร์ดูข้อมูลสมาชิกได้อย่างเดียว แก้ไม่ได้
 * ยกเว้นช่องเดียวคือ sessionsUsed ที่เพิ่มตอนกดปิดคิว PT — ถ้าบล็อกทั้งก้อน
 * ครั้งเทรนจะไม่ถูกตัดโดยที่ไม่มีใครรู้
 * ใช้ของในฐานข้อมูลเป็นฐานเสมอ จึงเพิ่ม/ลบสมาชิก และแก้ช่องอื่นไม่ได้
 */
export function restrictMembersToSessionUsage(
  incoming: Member[],
  existing: Member[]
): { members: Member[]; blocked: boolean } {
  const incomingById = new Map(incoming.map((m) => [m.id, m] as const));
  let blocked = incoming.length !== existing.length;

  const members = existing.map((current) => {
    const next = incomingById.get(current.id);
    if (!next) {
      blocked = true;
      return current;
    }

    const used = acceptedSessionsUsed(current, next);
    const merged =
      used === (current.sessionsUsed ?? 0) ? current : { ...current, sessionsUsed: used };
    // เทียบกับที่รับจริง — ต่างเมื่อไหร่แปลว่ามีช่องอื่นถูกแก้มาแล้วโดนคืนค่าเดิม
    if (canonical(next) !== canonical(merged)) blocked = true;
    return merged;
  });

  return { members, blocked };
}

/** คิว PT เป็นของเทรนเนอร์คนนั้น ส่วนคลาสดูจากเทรนเนอร์ประจำคลาส */
export function isBookingOwnedByTrainer(
  booking: Pick<Booking, "type" | "resourceId">,
  staffId: string | null,
  classTrainerIds: Map<string, string>
): boolean {
  if (!staffId) return false;
  if (booking.type === "trainer") return booking.resourceId === staffId;
  if (booking.type === "class") return classTrainerIds.get(booking.resourceId) === staffId;
  return false;
}

export function classTrainerMap(
  classes: { id: string; trainerId: string }[]
): Map<string, string> {
  return new Map(classes.map((c) => [c.id, c.trainerId]));
}

/**
 * เทรนเนอร์แก้ได้เฉพาะคิวของตัวเอง
 * ใช้ของในฐานข้อมูลเป็นฐาน แล้วทับด้วยเวอร์ชันใหม่เฉพาะรายการที่เป็นของเขาทั้งก่อนและหลัง
 * รายการของคนอื่นจึงแก้ไม่ได้ ลบไม่ได้ และแอบย้ายเจ้าของไม่ได้
 */
export function restrictBookingsToTrainer(
  incoming: Booking[],
  existing: Pick<AppData, "bookings" | "classes">,
  staffId: string | null
): { bookings: Booking[]; blocked: number } {
  const trainerIds = classTrainerMap(existing.classes);
  const owns = (b: Pick<Booking, "type" | "resourceId">) =>
    isBookingOwnedByTrainer(b, staffId, trainerIds);

  const ownedIncoming = new Map(
    incoming.filter(owns).map((b) => [b.id, b] as const)
  );
  const existingIds = new Set(existing.bookings.map((b) => b.id));

  const bookings = existing.bookings.map((b) =>
    owns(b) ? (ownedIncoming.get(b.id) ?? b) : b
  );
  for (const [id, booking] of ownedIncoming) {
    if (!existingIds.has(id)) bookings.push(booking);
  }

  const allowedIds = new Set(bookings.map((b) => b.id));
  const blocked = incoming.filter(
    (b) => !ownedIncoming.has(b.id) && !allowedIds.has(b.id)
  ).length;

  return { bookings, blocked };
}
