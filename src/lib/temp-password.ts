// คำที่อ่านออกเสียงง่ายและไม่มีตัวอักษรที่สับสนกับตัวเลข เพื่อให้บอกทางโทรศัพท์ได้
const WORDS = [
  "Lift",
  "Squat",
  "Bench",
  "Power",
  "Sprint",
  "Cardio",
  "Muscle",
  "Strong",
  "Active",
  "Energy",
];

/** สร้างรหัสผ่านชั่วคราวที่ผ่านเกณฑ์ checkPasswordStrength และพิมพ์ตามได้ง่าย */
export function generateTempPassword(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${word}${digits}`;
}
