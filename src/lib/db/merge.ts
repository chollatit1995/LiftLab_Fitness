/** รวมข้อมูลจาก server กับ client — เก็บรายการที่ server มีแต่ client ไม่มี (เช่น booking จาก portal) */
export function mergeById<T extends { id: string }>(
  serverItems: T[],
  clientItems: T[]
): T[] {
  const map = new Map<string, T>();
  for (const item of serverItems) map.set(item.id, item);
  for (const item of clientItems) map.set(item.id, item);
  return Array.from(map.values());
}

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
