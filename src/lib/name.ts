/** บังคับชื่อเป็นภาษาอังกฤษ (A-Z) เท่านั้น — ใช้สำหรับ login และทะเบียนคน */

/** อนุญาตตัวอักษรอังกฤษ ช่องว่าง จุด อะพอสทรอฟี และขีด */
export const ENGLISH_NAME_REGEX = /^[A-Za-z]+(?:[ .'\-][A-Za-z]+)*$/;

export const ENGLISH_NAME_PATTERN = "[A-Za-z]+([ .'\\-][A-Za-z]+)*";

export const ENGLISH_NAME_ERROR =
  "ชื่อต้องเป็นภาษาอังกฤษเท่านั้น (A-Z) เช่น Somchai Jaidee";

export const ENGLISH_NAME_HINT = "English letters only (A-Z)";

export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isEnglishName(value: string): boolean {
  const normalized = normalizePersonName(value);
  return normalized.length > 0 && ENGLISH_NAME_REGEX.test(normalized);
}

/** กรองตอนพิมพ์ — ตัดอักขระที่ไม่ใช่ภาษาอังกฤษออก */
export function filterEnglishNameInput(value: string): string {
  return value.replace(/[^A-Za-z .'\-]/g, "");
}

export function englishNameOrError(value: unknown):
  | { ok: true; name: string }
  | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "กรุณากรอกชื่อ" };
  }
  const name = normalizePersonName(value);
  if (!name) {
    return { ok: false, error: "กรุณากรอกชื่อ" };
  }
  if (!isEnglishName(name)) {
    return { ok: false, error: ENGLISH_NAME_ERROR };
  }
  return { ok: true, name };
}
