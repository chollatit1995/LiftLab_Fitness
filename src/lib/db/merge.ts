/** รวม renewals แบบ append-only — ไม่ลบประวัติที่ server มี */
export function mergeRenewals<T extends { id: string }>(
  serverItems: T[],
  clientItems: T[]
): T[] {
  const map = new Map<string, T>();
  for (const item of serverItems) map.set(item.id, item);
  for (const item of clientItems) map.set(item.id, item);
  return Array.from(map.values()).sort((a, b) => {
    const aDate = (a as { renewedAt?: string }).renewedAt ?? "";
    const bDate = (b as { renewedAt?: string }).renewedAt ?? "";
    return bDate.localeCompare(aDate);
  });
}

/** สถานะที่ถือว่าจบแล้ว — เปลี่ยนกลับไม่ได้ */
const TERMINAL_BOOKING_STATUSES = new Set(["cancelled", "completed"]);

/**
 * รวม booking โดยให้สถานะที่จบแล้วในฐานข้อมูล (ยกเลิก/เสร็จสิ้น) ชนะฝั่ง client เสมอ
 * หน้าแอดมินโหลดข้อมูลทั้งก้อนไว้ตอนเปิดหน้า แล้วส่งกลับมาทั้งก้อนตอนบันทึก
 * ถ้าไม่กันไว้ หน้าที่เปิดค้างไว้จะเอาสถานะเก่ามาปลุก booking ที่ยกเลิกไปแล้วให้กลับมา confirmed
 */
export function mergeBookings<T extends { id: string; status: string }>(
  serverItems: T[],
  clientItems: T[]
): T[] {
  const map = new Map<string, T>();
  for (const item of serverItems) map.set(item.id, item);
  for (const item of clientItems) {
    const server = map.get(item.id);
    if (server && TERMINAL_BOOKING_STATUSES.has(server.status)) continue;
    map.set(item.id, item);
  }
  return Array.from(map.values());
}
