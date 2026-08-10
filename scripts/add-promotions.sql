-- เพิ่มระบบโปรโมชั่นให้ฐานข้อมูลที่มีข้อมูลอยู่แล้ว
-- รันใน Supabase SQL Editor ได้เลย รันซ้ำได้ไม่พัง

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  package_id TEXT,
  code TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  highlight BOOLEAN NOT NULL DEFAULT FALSE
);

-- โปรตัวอย่าง ลบทิ้งได้ถ้าจะสร้างเองผ่านหน้าเว็บ
INSERT INTO promotions (id, title, description, discount_type, discount_value, package_id, code, start_date, end_date, status, highlight) VALUES
  ('pr1', 'สมัครใหม่เดือนนี้ ลด 20%', 'ลูกค้าใหม่ที่สมัครแพ็กเกจ Starter ภายในเดือนนี้ รับส่วนลดทันที 20% ใช้ได้ที่เคาน์เตอร์', 'percent', 20, 'p2', 'NEW20', '2026-08-01', '2026-08-31', 'active', TRUE),
  ('pr2', 'เพื่อนชวนเพื่อน ลด 500 บาท', 'แนะนำเพื่อนมาสมัครสมาชิก รับส่วนลด 500 บาททั้งคุณและเพื่อน ใช้ได้กับทุกแพ็กเกจ', 'amount', 500, NULL, 'FRIEND500', '2026-07-01', '2026-12-31', 'active', FALSE),
  ('pr3', 'ต่ออายุ Growth รับ PT ฟรี 2 ครั้ง', 'สมาชิกที่ต่ออายุแพ็กเกจ Growth รับคูปองเทรนเนอร์ส่วนตัวฟรี 2 ครั้ง จองได้ภายใน 60 วัน', 'gift', 0, 'p3', NULL, '2026-08-01', '2026-09-30', 'active', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT id, title, discount_type, discount_value, start_date, end_date, status
FROM promotions ORDER BY highlight DESC, end_date;
