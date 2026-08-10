import type { ClipboardEvent, KeyboardEvent } from "react";

const PHONE_DIGIT_LIMIT = 10;

/** จัดรูปแบบเบอร์มือถือไทย 10 หลัก → XXX-XXX-XXXX เช่น 092-860-3655 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, PHONE_DIGIT_LIMIT);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** ลบขีดออก — ใช้ตอนค้นหาหรือเทียบเบอร์ */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isCompletePhone(value: string): boolean {
  return phoneDigits(value).length === PHONE_DIGIT_LIMIT;
}

const ALLOWED_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
]);

/** อนุญาตเฉพาะตัวเลข 0-9 และไม่เกิน 10 หลัก */
export function handlePhoneKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
  if (e.ctrlKey || e.metaKey) return;
  if (ALLOWED_KEYS.has(e.key)) return;
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  const digits = phoneDigits(e.currentTarget.value);
  if (digits.length >= PHONE_DIGIT_LIMIT) {
    e.preventDefault();
  }
}

export function handlePhonePaste(
  e: ClipboardEvent<HTMLInputElement>,
  onChange: (value: string) => void
): void {
  e.preventDefault();
  onChange(formatPhoneInput(e.clipboardData.getData("text")));
}

export const phoneFieldPattern = "\\d{3}-\\d{3}-\\d{4}";

export const phoneFieldTitle = "กรุณากรอกเบอร์โทร 10 หลัก (ตัวเลขเท่านั้น)";
