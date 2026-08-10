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

-- คอลัมน์สำหรับบังคับเปลี่ยนรหัสผ่านครั้งแรก และล็อกบัญชีเมื่อกรอกผิดหลายครั้ง
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- บัญชีเริ่มต้น (รหัสผ่านจะถูกแปลงเป็น bcrypt hash อัตโนมัติในการ login ครั้งแรก)
INSERT INTO app_users (id, email, password, name, role, status, must_change_password) VALUES
  ('u1', 'admin@liftlab.fitness', 'LiftLab@2026', 'ผู้ดูแลระบบ', 'admin', 'active', TRUE),
  ('u2', 'manager@liftlab.fitness', 'LiftLab@2026', 'ผู้จัดการ', 'manager', 'active', TRUE)
ON CONFLICT (id) DO NOTHING;
