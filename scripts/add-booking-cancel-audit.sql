-- เพิ่มร่องรอยการยกเลิกการจอง (ใครกด บทบาทอะไร เมื่อไร)
-- รันได้ซ้ำโดยไม่มีผลข้างเคียง
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by_role TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- การจองที่ยกเลิกไปก่อนมีคอลัมน์นี้จะเป็น NULL — ย้อนหลังไม่ได้
-- ดูรายการที่ยกเลิกแล้วพร้อมผู้กด:
-- SELECT b.id, b.resource_name, b.date, b.time,
--        b.cancelled_by, b.cancelled_by_role, b.cancelled_at
-- FROM bookings b
-- WHERE b.status = 'cancelled'
-- ORDER BY b.cancelled_at DESC NULLS LAST;
