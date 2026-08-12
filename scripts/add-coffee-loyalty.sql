-- Liftlab Coffee loyalty tables
CREATE TABLE IF NOT EXISTS coffee_loyalty (
  member_id TEXT PRIMARY KEY,
  stamps INTEGER NOT NULL DEFAULT 0,
  total_stamps INTEGER NOT NULL DEFAULT 0,
  free_redeemed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coffee_loyalty_events (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  stamps_after INTEGER NOT NULL DEFAULT 0,
  staff_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coffee_stamp_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'stamp',
  status TEXT NOT NULL DEFAULT 'pending',
  stamps_snapshot INTEGER NOT NULL DEFAULT 0,
  staff_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
