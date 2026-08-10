/** แปลงค่าวันที่จาก Postgres (Date object / ISO / string) เป็น YYYY-MM-DD */
export function toISODate(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getUTCFullYear();
  const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const d = String(parsed.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** จำนวนวันจากวันนี้ถึงวันที่กำหนด (บวก = ยังไม่ถึง, ลบ = ผ่านมาแล้ว) */
export function daysUntil(dateStr: string, today: string = todayISO()): number {
  const targetIso = toISODate(dateStr);
  const todayIso = toISODate(today);
  if (!targetIso || !todayIso) return NaN;
  const target = new Date(targetIso + "T12:00:00");
  const todayDate = new Date(todayIso + "T12:00:00");
  if (Number.isNaN(target.getTime()) || Number.isNaN(todayDate.getTime())) {
    return NaN;
  }
  return Math.ceil(
    (target.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}
