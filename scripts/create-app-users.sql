-- LiftLab Fitness: ตาราง Login (Email, Password, Role)
-- รันใน Supabase SQL Editor หรือเรียก /api/db/migrate

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- บัญชีเริ่มต้น (รหัสผ่าน: LiftLab@2026)
INSERT INTO app_users (id, email, password_hash, name, role, status) VALUES
  ('u1', 'admin@liftlab.fitness', '$2b$10$hyAHhP2gRETcfbSJKRuYvuLLVMGeVTpws8xr1UeHswgohR.0ykdz2', 'ผู้ดูแลระบบ', 'admin', 'active'),
  ('u2', 'manager@liftlab.fitness', '$2b$10$hyAHhP2gRETcfbSJKRuYvuLLVMGeVTpws8xr1UeHswgohR.0ykdz2', 'ผู้จัดการ', 'manager', 'active')
ON CONFLICT (id) DO NOTHING;
