-- LiftLab Fitness: ตาราง Login (Email, Password, Role)
-- รันใน Supabase SQL Editor

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ถ้ามีตารางเก่าที่ใช้ password_hash ให้รันบรรทัดนี้:
-- ALTER TABLE app_users RENAME COLUMN password_hash TO password;

-- บัญชีเริ่มต้น
INSERT INTO app_users (id, email, password, name, role, status) VALUES
  ('u1', 'admin@liftlab.fitness', 'LiftLab@2026', 'ผู้ดูแลระบบ', 'admin', 'active'),
  ('u2', 'manager@liftlab.fitness', 'LiftLab@2026', 'ผู้จัดการ', 'manager', 'active')
ON CONFLICT (id) DO NOTHING;
