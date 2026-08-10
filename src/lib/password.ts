import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/**
 * บัญชีที่สร้างก่อนมีการ hash เก็บรหัสผ่านเป็น plain text
 * ใช้รูปแบบของ hash เป็นตัวแยกว่าแถวไหนยังเป็นของเก่า
 */
export function isHashed(stored: string): boolean {
  return /^\$2[aby]\$/.test(stored);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  if (isHashed(stored)) {
    return bcrypt.compare(plain, stored);
  }
  return plain === stored;
}

export interface PasswordCheck {
  ok: boolean;
  message?: string;
}

export function checkPasswordStrength(password: string): PasswordCheck {
  if (password.length < 8) {
    return { ok: false, message: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      ok: false,
      message: "รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข",
    };
  }
  return { ok: true };
}
