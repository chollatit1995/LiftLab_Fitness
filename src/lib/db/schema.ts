export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    joined_at DATE NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS fitness_classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    trainer_id TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    schedule TEXT NOT NULL DEFAULT '',
    price NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
  )`,
  `CREATE TABLE IF NOT EXISTS membership_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price NUMERIC NOT NULL,
    duration_days INTEGER NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    popular BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  `CREATE TABLE IF NOT EXISTS promotions (
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
  )`,
  `CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    package_id TEXT NOT NULL,
    joined_at DATE NOT NULL,
    expires_at DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
  )`,
  `CREATE TABLE IF NOT EXISTS facilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'available'
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    member_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    item TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  // ตารางเดิมถูกสร้างไว้ก่อนมีคอลัมน์เหล่านี้ CREATE TABLE IF NOT EXISTS จึงไม่เพิ่มให้
  `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`,
  `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ`,
  // ผูกบัญชี login กับทะเบียนพนักงาน เพื่อสร้างบัญชีจากหน้าจัดการพนักงานได้
  `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS staff_id TEXT`,
  // แยกตารางออกจาก members เพราะ saveAppData ลบและเขียนแถว members ใหม่ทุกครั้ง
  `CREATE TABLE IF NOT EXISTS member_users (
    member_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS membership_renewals (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    package_id TEXT NOT NULL,
    package_name TEXT NOT NULL,
    previous_expires_at DATE NOT NULL,
    new_expires_at DATE NOT NULL,
    original_price NUMERIC NOT NULL,
    final_price NUMERIC NOT NULL,
    promotion_id TEXT,
    promotion_title TEXT,
    renewed_at DATE NOT NULL,
    renewed_by TEXT
  )`,
  `ALTER TABLE sales ADD COLUMN IF NOT EXISTS original_amount NUMERIC`,
  `ALTER TABLE sales ADD COLUMN IF NOT EXISTS promotion_id TEXT`,
  `ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS session_limit INTEGER`,
  `ALTER TABLE members ADD COLUMN IF NOT EXISTS sessions_total INTEGER`,
  `ALTER TABLE members ADD COLUMN IF NOT EXISTS sessions_used INTEGER NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS coffee_loyalty (
    member_id TEXT PRIMARY KEY,
    stamps INTEGER NOT NULL DEFAULT 0,
    total_stamps INTEGER NOT NULL DEFAULT 0,
    free_redeemed INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS coffee_loyalty_events (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    stamps_after INTEGER NOT NULL DEFAULT 0,
    staff_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS coffee_stamp_requests (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    request_type TEXT NOT NULL DEFAULT 'stamp',
    status TEXT NOT NULL DEFAULT 'pending',
    stamps_snapshot INTEGER NOT NULL DEFAULT 0,
    staff_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
  )`,
];
