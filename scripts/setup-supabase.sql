-- LiftLab Fitness — รันใน Supabase SQL Editor
-- Project: liftlab-db → SQL Editor → New query → Run

-- ========== สร้างตาราง ==========

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS fitness_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  trainer_id TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  schedule TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS membership_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  popular BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  package_id TEXT NOT NULL,
  joined_at DATE NOT NULL,
  expires_at DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  member_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  item TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== ผู้ใช้งานระบบ ==========

INSERT INTO app_users (id, email, password, name, role, status) VALUES
  ('u1', 'admin@liftlab.fitness', 'LiftLab@2026', 'ผู้ดูแลระบบ', 'admin', 'active'),
  ('u2', 'manager@liftlab.fitness', 'LiftLab@2026', 'ผู้จัดการ', 'manager', 'active')
ON CONFLICT (id) DO NOTHING;

-- ========== ข้อมูลตัวอย่าง ==========

INSERT INTO staff (id, name, email, phone, role, status, joined_at) VALUES
  ('s1', 'สมชาย ใจดี', 'somchai@liftlab.fitness', '081-234-5678', 'manager', 'active', '2024-01-15'),
  ('s2', 'นภา แข็งแรง', 'napa@liftlab.fitness', '082-345-6789', 'trainer', 'active', '2024-03-01'),
  ('s3', 'วิชัย ฟิตเนส', 'wichai@liftlab.fitness', '083-456-7890', 'trainer', 'active', '2024-05-10'),
  ('s4', 'พิมพ์ใจ รักงาน', 'pimjai@liftlab.fitness', '084-567-8901', 'front_desk', 'active', '2024-06-20')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fitness_classes (id, name, description, trainer_id, capacity, duration, schedule, price, status) VALUES
  ('c1', 'HIIT Burn', 'คลาสคาร์ดio ความเข้มสูง ลดไขมันอย่างมีประสิทธิภาพ', 's2', 20, 45, 'จันทร์, พุธ, ศุกร์ 18:00', 350, 'active'),
  ('c2', 'Yoga Flow', 'โยคะเพื่อความยืดหยุ่นและผ่อนคลาย', 's3', 15, 60, 'อังคาร, พฤหัส 07:00', 300, 'active'),
  ('c3', 'Strength Training', 'ฝึกความแข็งแรงด้วยเวทเทรนning', 's2', 12, 60, 'จ-ศ 10:00, 17:00', 400, 'active'),
  ('c4', 'Spin Cycle', 'ปั่นจักรยานในร่ม เผาผลาญแคลอรี่', 's3', 25, 45, 'เสาร์-อาทิตย์ 09:00', 350, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO membership_packages (id, name, description, price, duration_days, features, status, popular) VALUES
  ('p1', 'Mini', 'สตูดิโอเปิดใหม่', 990, 30, '["แดชบอร์ดสรุปคลาส สมาชิก และยอดขาย","ระบบจองคลาส เทรนเนอร์ และพื้นที่","จัดการพนักงาน","จัดการคลาสและแพ็กเกจสมาชิก"]', 'active', false),
  ('p2', 'Starter', 'ฟิตเนสกำลังโต', 2990, 90, '["ทุกอย่างใน Mini +","แอปพลิเคชันสำหรับเทรนเนอร์","เชื่อมต่อ LINE Official Account","ระบบ CRM และ Sales Pipeline"]', 'active', true),
  ('p3', 'Growth', 'ขนาดกลาง-ใหญ่', 4990, 180, '["ทุกอย่างใน Starter +","คำนวณค่าคอมมิชชั่น","เชื่อมต่อ POS","เชื่อมต่อ Access Control"]', 'active', false),
  ('p4', 'Accelerate', 'เชนหลายสาขา', 9990, 365, '["ทุกอย่างใน Growth +","Dashboard + Raw Data Export","E-Document","รองรับหลายสาขา"]', 'active', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO members (id, name, email, phone, package_id, joined_at, expires_at, status) VALUES
  ('m1', 'กมล สุขใจ', 'kamol@email.com', '089-111-2222', 'p2', '2025-06-01', '2025-09-01', 'active'),
  ('m2', 'อรทัย ฟิต', 'orathai@email.com', '089-333-4444', 'p1', '2025-07-15', '2025-08-15', 'active'),
  ('m3', 'ธนากร แรง', 'tanakorn@email.com', '089-555-6666', 'p3', '2025-01-10', '2025-07-10', 'expired'),
  ('m4', 'ปิยะ ดี', 'piya@email.com', '089-777-8888', 'p2', '2025-08-01', '2025-11-01', 'active'),
  ('m5', 'มานี มีสุข', 'manee@email.com', '089-999-0000', 'p1', '2025-08-05', '2025-09-05', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO facilities (id, name, type, capacity, status) VALUES
  ('f1', 'Studio A', 'Group Class Room', 25, 'available'),
  ('f2', 'Studio B', 'Yoga Room', 15, 'available'),
  ('f3', 'PT Room 1', 'Personal Training', 2, 'available'),
  ('f4', 'Spin Room', 'Cycling Studio', 30, 'maintenance')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookings (id, type, member_id, resource_id, resource_name, date, time, status) VALUES
  ('b1', 'class', 'm1', 'c1', 'HIIT Burn', '2025-08-09', '18:00', 'confirmed'),
  ('b2', 'trainer', 'm2', 's2', 'นภา แข็งแรง (PT)', '2025-08-09', '10:00', 'confirmed'),
  ('b3', 'facility', 'm4', 'f1', 'Studio A', '2025-08-10', '14:00', 'confirmed'),
  ('b4', 'class', 'm1', 'c2', 'Yoga Flow', '2025-08-08', '07:00', 'completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales (id, member_id, member_name, item, amount, date, type) VALUES
  ('sl1', 'm1', 'กมล สุขใจ', 'Starter Package (90 วัน)', 2990, '2025-06-01', 'membership'),
  ('sl2', 'm2', 'อรทัย ฟิต', 'Mini Package (30 วัน)', 990, '2025-07-15', 'membership'),
  ('sl3', 'm4', 'ปิยะ ดี', 'Starter Package (90 วัน)', 2990, '2025-08-01', 'membership'),
  ('sl4', 'm1', 'กมล สุขใจ', 'HIIT Burn — Drop-in', 350, '2025-08-05', 'class'),
  ('sl5', 'm2', 'อรทัย ฟิต', 'Personal Training (5 sessions)', 4500, '2025-08-03', 'pt')
ON CONFLICT (id) DO NOTHING;
