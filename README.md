# LiftLab Fitness — ระบบจัดการฟิตเนส

ระบบบริหารจัดการฟิตเนสครบวงจรสำหรับ **LiftLab Fitness**

## ฟีเจอร์

- **แดชบอร์ด** — สรุปคลาส สมาชิก และยอดขาย
- **ระบบจอง** — จองคลาส เทรนเนอร์ (PT) และพื้นที่
- **จัดการสมาชิก** — CRUD สมาชิก ค้นหา กรองสถานะ และต่ออายุแพ็กเกจ (บันทึกยอดขายอัตโนมัติ)
- **จัดการพนักงาน** — CRUD พนักงานและเทรนเนอร์
- **คลาส & แพ็กเกจ** — จัดการคลาสและแพ็กเกจสมาชิก

## เริ่มใช้งาน (Local)

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

> Local dev ใช้ LocalStorage เป็น fallback หากยังไม่ได้ตั้งค่า `POSTGRES_URL`

---

## Deploy บน Vercel + Supabase

### 1. Push ขึ้น GitHub

Repo: [github.com/chollatit1995/LiftLab_Fitness](https://github.com/chollatit1995/LiftLab_Fitness)

### 2. เชื่อม Vercel

1. ไปที่ [vercel.com/new](https://vercel.com/new)
2. Import repository จาก GitHub
3. กด **Deploy**

### 3. สร้างฐานข้อมูล Supabase บน Vercel

1. เปิด Project บน Vercel Dashboard
2. ไปที่ **Storage** → **Create Database** → เลือก **Supabase**
3. ตั้งชื่อ `liftlab-db` → **Create**
4. **Connect to Project** → เลือก project `liftlab-fitness`
5. Vercel จะ inject env vars อัตโนมัติ เช่น `POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_URL`
6. **Redeploy** project

> ถ้า `POSTGRES_URL` ไม่ถูก inject: ไปที่ Supabase Dashboard → **Settings → Database → Connection string (URI)** → copy แล้วเพิ่มเป็น `POSTGRES_URL` ใน Vercel Environment Variables

### 4. สร้างตาราง + ข้อมูลตัวอย่าง

หลัง deploy แล้ว เรียก API ครั้งเดียว:

```bash
curl -X POST https://YOUR-APP.vercel.app/api/db/migrate
```

หรือเปิดเว็บครั้งแรก — ระบบจะสร้าง schema และ seed ข้อมูลอัตโนมัติผ่าน `GET /api/data`

### 5. ตรวจสอบ

- เปิดเว็บ → ข้อมูลควรโหลดจาก Postgres
- แก้ไขข้อมูล → บันทึกลง DB ผ่าน `PUT /api/data`

---

## โครงสร้างฐานข้อมูล

| ตาราง | รายละเอียด |
|-------|-----------|
| `staff` | พนักงานและเทรนเนอร์ |
| `fitness_classes` | คลาสออกกำลังกาย |
| `membership_packages` | แพ็กเกจสมาชิก |
| `members` | สมาชิก |
| `facilities` | พื้นที่/ห้อง |
| `bookings` | การจอง |
| `sales` | ยอดขาย |

Schema SQL: [`scripts/schema.sql`](scripts/schema.sql)

## API

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/data` | โหลดข้อมูลทั้งหมด (auto-seed ถ้าว่าง) |
| PUT | `/api/data` | บันทึกข้อมูลทั้งหมด |
| POST | `/api/db/migrate` | สร้างตาราง + seed ข้อมูล |

## เทคโนโลยี

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS
- Vercel Postgres (`postgres` driver + Supabase)
