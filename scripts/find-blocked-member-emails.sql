-- หาอีเมลที่ "สมัครซ้ำแล้วบอกว่าถูกใช้แล้ว แต่หาสมาชิกไม่เจอ"
--
-- member_users.email เป็น UNIQUE แต่ไม่มี foreign key ไปที่ members
-- ถ้าแถวใน members หายไปโดยไม่ผ่านปุ่มลบในหน้าเว็บ (ปุ่มลบจะเรียก DELETE /api/members/access ให้เสมอ)
-- บัญชี portal จะค้างอยู่และยังจองอีเมลนั้นไว้ ทั้งที่ล็อกอินก็ไม่ได้เพราะ authenticateMember join กับ members

-- ── คำตอบเร็ว: ตอนนี้มีกี่รายการ ────────────────────────────────────────────
SELECT COUNT(*) AS ghost_accounts
FROM member_users mu
WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.id = mu.member_id);

-- ── 1) บัญชีผี: อีเมลที่ถูกจองไว้โดยสมาชิกที่ไม่มีอยู่แล้ว ───────────────────
-- นี่คือสาเหตุของข้อความ "อีเมลนี้ถูกใช้กับบัญชีสมาชิกอื่นแล้ว"
-- created_at บอกได้ว่าสมาชิกถูกเพิ่มเข้าระบบช่วงไหนก่อนจะหายไป
SELECT mu.member_id,
       mu.email,
       mu.created_at,
       mu.last_login_at
FROM member_users mu
WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.id = mu.member_id)
ORDER BY mu.created_at DESC;

-- ── 2) อีเมลไม่ตรงกันระหว่างทะเบียนสมาชิกกับบัญชี portal ────────────────────
-- เกิดเมื่อแก้อีเมลในหน้าสมาชิกแล้วไม่ได้กดตั้งรหัสผ่าน portal ใหม่
-- สมาชิกจะล็อกอินด้วยอีเมลใหม่ไม่ได้ และอีเมลเก่ายังถูกจองไว้อยู่
SELECT m.id,
       m.name,
       m.email  AS member_email,
       mu.email AS portal_email
FROM member_users mu
JOIN members m ON m.id = mu.member_id
WHERE LOWER(TRIM(m.email)) <> LOWER(TRIM(mu.email))
ORDER BY m.name;

-- ── 3) สมาชิกคนละคนใช้อีเมลเดียวกัน ─────────────────────────────────────────
-- ตาราง members ไม่มี unique บน email จึงซ้ำกันได้
-- คนแรกเปิด portal ได้ คนที่เหลือจะโดนปฏิเสธด้วยข้อความเดียวกัน แต่กรณีนี้ "หาสมาชิกเจอ"
SELECT LOWER(TRIM(email)) AS email,
       COUNT(*)           AS member_count,
       STRING_AGG(name || ' (' || id || ')', ', ' ORDER BY name) AS members
FROM members
GROUP BY LOWER(TRIM(email))
HAVING COUNT(*) > 1
ORDER BY member_count DESC;

-- ── 4) กู้ชื่อสมาชิกที่หายไป จากร่องรอยในตารางที่ไม่โดนลบ ───────────────────
-- coffee_* ไม่ได้ถูกเขียนผ่าน /api/data จึงรอดจากการลบหมู่ และ coffee_sales เก็บ member_name ไว้
-- bookings รอดเสมอเพราะ mergeBookings ไม่เคยลบแถวฝั่งเซิร์ฟเวอร์ แต่ไม่ได้เก็บชื่อ จึงได้แค่จำนวน
-- ส่วน sales กับ membership_renewals มักหายไปพร้อมสมาชิก (จะมีค่าก็ต่อเมื่อถูกบันทึกหลังสแนปช็อตที่ทับ)
SELECT mu.member_id,
       mu.email,
       mu.created_at,
       COALESCE(
         (SELECT cs.member_name FROM coffee_sales cs
           WHERE cs.member_id = mu.member_id AND cs.member_name IS NOT NULL
           ORDER BY cs.created_at DESC LIMIT 1),
         (SELECT s.member_name FROM sales s
           WHERE s.member_id = mu.member_id
           ORDER BY s.date DESC LIMIT 1),
         (SELECT r.member_name FROM membership_renewals r
           WHERE r.member_id = mu.member_id
           ORDER BY r.renewed_at DESC LIMIT 1)
       ) AS last_known_name,
       (SELECT COUNT(*) FROM bookings b WHERE b.member_id = mu.member_id) AS bookings_left,
       (SELECT COALESCE(cl.total_stamps, 0) FROM coffee_loyalty cl
         WHERE cl.member_id = mu.member_id) AS coffee_stamps
FROM member_users mu
WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.id = mu.member_id)
ORDER BY mu.created_at DESC;

-- ── วิธีแก้ข้อ 1: ปลดอีเมลที่ติดอยู่ ─────────────────────────────────────────
-- ดูผลจากคิวรีข้อ 1 ให้แน่ใจก่อน ข้อมูลสมาชิกเดิมกู้กลับไม่ได้แล้ว แถวที่ลบนี้คือบัญชี portal ที่ใช้ไม่ได้อยู่ดี
-- DELETE FROM member_users mu
-- WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.id = mu.member_id);

-- ── วิธีแก้ข้อ 2: ตั้งรหัสผ่าน portal ใหม่ให้สมาชิกคนนั้นจากหน้าสมาชิก ───────
-- setMemberPassword จะอัปเดตอีเมลให้ตรงกับทะเบียนเอง (ON CONFLICT (member_id) DO UPDATE)
