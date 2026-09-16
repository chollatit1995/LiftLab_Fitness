-- หาการจอง PT ที่ชนกัน: เทรนเนอร์คนเดียว วัน+เวลาเดียวกัน แต่มีมากกว่า 1 รายการที่ยังยืนยันอยู่
-- ต้องเคลียร์ให้เหลือ slot ละ 1 รายการก่อน index กันจองซ้ำ (bookings_trainer_slot_unique) จึงจะสร้างได้
SELECT b.resource_id,
       b.resource_name,
       b.date,
       b.time,
       COUNT(*) AS confirmed_count,
       STRING_AGG(b.id || ' (' || COALESCE(m.name, b.member_id) || ')', ', ' ORDER BY b.id) AS bookings
FROM bookings b
LEFT JOIN members m ON m.id = b.member_id
WHERE b.type = 'trainer'
  AND b.status = 'confirmed'
GROUP BY b.resource_id, b.resource_name, b.date, b.time
HAVING COUNT(*) > 1
ORDER BY b.date, b.time;

-- วิธีแก้: เปิดหน้า "การจอง" ในระบบแล้วกดยกเลิกรายการที่ไม่ต้องการ
-- หรือสั่งตรงในฐานข้อมูล (ใส่ id ที่ได้จากคิวรีข้างบน):
-- UPDATE bookings SET status = 'cancelled' WHERE id = '<booking_id>';

-- ตรวจว่า index ถูกสร้างแล้วหรือยัง
-- SELECT indexname FROM pg_indexes WHERE tablename = 'bookings';
