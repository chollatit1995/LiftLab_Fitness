-- ติดตามครั้งเทรน PT สำหรับแพ็กเกจแบบนับครั้ง (เช่น PT 10 ครั้ง / 30 วัน)
ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS session_limit INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS sessions_total INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS sessions_used INTEGER NOT NULL DEFAULT 0;
