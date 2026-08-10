import { AppData } from "./types";

export const STORAGE_KEY = "liftlab-fitness-data";

export const initialData: AppData = {
  staff: [
    {
      id: "s1",
      name: "สมชาย ใจดี",
      email: "somchai@liftlab.fitness",
      phone: "081-234-5678",
      role: "manager",
      status: "active",
      joinedAt: "2024-01-15",
    },
    {
      id: "s2",
      name: "นภา แข็งแรง",
      email: "napa@liftlab.fitness",
      phone: "082-345-6789",
      role: "trainer",
      status: "active",
      joinedAt: "2024-03-01",
    },
    {
      id: "s3",
      name: "วิชัย ฟิตเนส",
      email: "wichai@liftlab.fitness",
      phone: "083-456-7890",
      role: "trainer",
      status: "active",
      joinedAt: "2024-05-10",
    },
    {
      id: "s4",
      name: "พิมพ์ใจ รักงาน",
      email: "pimjai@liftlab.fitness",
      phone: "084-567-8901",
      role: "front_desk",
      status: "active",
      joinedAt: "2024-06-20",
    },
  ],
  classes: [
    {
      id: "c1",
      name: "HIIT Burn",
      description: "คลาสคาร์ดio ความเข้มสูง ลดไขมันอย่างมีประสิทธิภาพ",
      trainerId: "s2",
      capacity: 20,
      duration: 45,
      schedule: "จันทร์, พุธ, ศุกร์ 18:00",
      price: 350,
      status: "active",
    },
    {
      id: "c2",
      name: "Yoga Flow",
      description: "โยคะเพื่อความยืดหยุ่นและผ่อนคลาย",
      trainerId: "s3",
      capacity: 15,
      duration: 60,
      schedule: "อังคาร, พฤหัส 07:00",
      price: 300,
      status: "active",
    },
    {
      id: "c3",
      name: "Strength Training",
      description: "ฝึกความแข็งแรงด้วยเวทเทรนning",
      trainerId: "s2",
      capacity: 12,
      duration: 60,
      schedule: "จ-ศ 10:00, 17:00",
      price: 400,
      status: "active",
    },
    {
      id: "c4",
      name: "Spin Cycle",
      description: "ปั่นจักรยานในร่ม เผาผลาญแคลอรี่",
      trainerId: "s3",
      capacity: 25,
      duration: 45,
      schedule: "เสาร์-อาทิตย์ 09:00",
      price: 350,
      status: "active",
    },
  ],
  packages: [
    {
      id: "p1",
      name: "Mini",
      description: "สตูดิโอเปิดใหม่ — เปลี่ยนจาก Excel เป็นระบบในวันเดียว",
      price: 990,
      durationDays: 30,
      features: [
        "แดชบอร์ดสรุปคลาส สมาชิก และยอดขาย",
        "ระบบจองคลาส เทรนเนอร์ และพื้นที่",
        "จัดการพนักงาน",
        "จัดการคลาสและแพ็กเกจสมาชิก",
      ],
      status: "active",
    },
    {
      id: "p2",
      name: "Starter",
      description: "ฟิตเนสกำลังโต — เพิ่มแอปเทรนเนอร์และ CRM",
      price: 2990,
      durationDays: 90,
      features: [
        "ทุกอย่างใน Mini +",
        "แอปพลิเคชันสำหรับเทรนเนอร์",
        "เชื่อมต่อ LINE Official Account",
        "ระบบ CRM และ Sales Pipeline",
      ],
      status: "active",
      popular: true,
    },
    {
      id: "p3",
      name: "Growth",
      description: "ขนาดกลาง-ใหญ่ — เชื่อม POS และประตูอัตโนมัติ",
      price: 4990,
      durationDays: 180,
      features: [
        "ทุกอย่างใน Starter +",
        "คำนวณค่าคอมมิชชั่น",
        "เชื่อมต่อ POS",
        "เชื่อมต่อ Access Control",
      ],
      status: "active",
    },
    {
      id: "p4",
      name: "Accelerate",
      description: "เชนหลายสาขา — บริหารทุกสาขาในแดชบอร์ดเดียว",
      price: 9990,
      durationDays: 365,
      features: [
        "ทุกอย่างใน Growth +",
        "Dashboard + Raw Data Export",
        "E-Document",
        "รองรับหลายสาขา",
      ],
      status: "active",
    },
  ],
  members: [
    {
      id: "m1",
      name: "กมล สุขใจ",
      email: "kamol@email.com",
      phone: "089-111-2222",
      packageId: "p2",
      joinedAt: "2026-05-11",
      expiresAt: "2026-08-09",
      status: "active",
    },
    {
      id: "m2",
      name: "อรทัย ฟิต",
      email: "orathai@email.com",
      phone: "089-333-4444",
      packageId: "p1",
      joinedAt: "2026-07-15",
      expiresAt: "2026-08-15",
      status: "active",
    },
    {
      id: "m3",
      name: "ธนากร แรง",
      email: "tanakorn@email.com",
      phone: "089-555-6666",
      packageId: "p3",
      joinedAt: "2026-01-10",
      expiresAt: "2026-07-10",
      status: "expired",
    },
    {
      id: "m4",
      name: "ปิยะ ดี",
      email: "piya@email.com",
      phone: "089-777-8888",
      packageId: "p2",
      joinedAt: "2026-06-01",
      expiresAt: "2026-09-01",
      status: "active",
    },
    {
      id: "m5",
      name: "มานี มีสุข",
      email: "manee@email.com",
      phone: "089-999-0000",
      packageId: "p1",
      joinedAt: "2026-08-05",
      expiresAt: "2026-09-05",
      status: "pending",
    },
  ],
  bookings: [
    {
      id: "b1",
      type: "class",
      memberId: "m1",
      resourceId: "c1",
      resourceName: "HIIT Burn",
      date: "2026-08-09",
      time: "18:00",
      status: "confirmed",
    },
    {
      id: "b2",
      type: "trainer",
      memberId: "m2",
      resourceId: "s2",
      resourceName: "นภา แข็งแรง (PT)",
      date: "2026-08-09",
      time: "10:00",
      status: "confirmed",
    },
    {
      id: "b3",
      type: "facility",
      memberId: "m4",
      resourceId: "f1",
      resourceName: "Studio A",
      date: "2026-08-10",
      time: "14:00",
      status: "confirmed",
    },
    {
      id: "b4",
      type: "class",
      memberId: "m1",
      resourceId: "c2",
      resourceName: "Yoga Flow",
      date: "2026-08-08",
      time: "07:00",
      status: "completed",
    },
  ],
  facilities: [
    {
      id: "f1",
      name: "Studio A",
      type: "Group Class Room",
      capacity: 25,
      status: "available",
    },
    {
      id: "f2",
      name: "Studio B",
      type: "Yoga Room",
      capacity: 15,
      status: "available",
    },
    {
      id: "f3",
      name: "PT Room 1",
      type: "Personal Training",
      capacity: 2,
      status: "available",
    },
    {
      id: "f4",
      name: "Spin Room",
      type: "Cycling Studio",
      capacity: 30,
      status: "maintenance",
    },
  ],
  sales: [
    {
      id: "sl1",
      memberId: "m1",
      memberName: "กมล สุขใจ",
      item: "Starter Package (90 วัน)",
      amount: 2990,
      date: "2026-05-11",
      type: "membership",
    },
    {
      id: "sl2",
      memberId: "m2",
      memberName: "อรทัย ฟิต",
      item: "Mini Package (30 วัน)",
      amount: 990,
      date: "2026-07-15",
      type: "membership",
    },
    {
      id: "sl3",
      memberId: "m4",
      memberName: "ปิยะ ดี",
      item: "Starter Package (90 วัน)",
      amount: 2990,
      date: "2026-06-01",
      type: "membership",
    },
    {
      id: "sl4",
      memberId: "m1",
      memberName: "กมล สุขใจ",
      item: "HIIT Burn — Drop-in",
      amount: 350,
      date: "2026-08-05",
      type: "class",
    },
    {
      id: "sl5",
      memberId: "m2",
      memberName: "อรทัย ฟิต",
      item: "Personal Training (5 sessions)",
      amount: 4500,
      date: "2026-08-03",
      type: "pt",
    },
  ],
};

export function loadData(): AppData {
  if (typeof window === "undefined") return initialData;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as AppData;
  } catch {
    /* use initial */
  }
  return initialData;
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function generateId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export const roleLabels: Record<string, { th: string; en: string }> = {
  admin: { th: "ผู้ดูแลระบบ", en: "Admin" },
  manager: { th: "ผู้จัดการ", en: "Manager" },
  trainer: { th: "เทรนเนอร์", en: "Trainer" },
  front_desk: { th: "แคชเชียร์/ต้อนรับ", en: "Front Desk" },
};

export const bookingTypeLabels: Record<string, { th: string; en: string }> = {
  class: { th: "คลาส", en: "Class" },
  trainer: { th: "เทรนเนอร์ (PT)", en: "Trainer (PT)" },
  facility: { th: "พื้นที่", en: "Facility" },
};

export const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-emerald-100 text-emerald-700",
  available: "bg-emerald-100 text-emerald-700",
  maintenance: "bg-orange-100 text-orange-700",
};
