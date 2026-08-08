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
];
