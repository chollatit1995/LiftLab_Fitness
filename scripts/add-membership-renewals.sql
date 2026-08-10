-- ประวัติการต่ออายุสมาชิก + คอลัมน์โปรในยอดขาย
CREATE TABLE IF NOT EXISTS membership_renewals (
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
);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS original_amount NUMERIC;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS promotion_id TEXT;
