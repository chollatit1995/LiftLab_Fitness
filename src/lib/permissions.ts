import { AppUserRole } from "./user-types";

export interface NavItem {
  href: string;
  icon: string;
  labelTh: string;
  labelEn: string;
  roles: AppUserRole[];
}

const ALL_ROLES: AppUserRole[] = ["admin", "manager", "staff"];

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    icon: "dashboard",
    labelTh: "แดชบอร์ด",
    labelEn: "Dashboard",
    roles: ALL_ROLES,
  },
  {
    href: "/bookings",
    icon: "event",
    labelTh: "จองคลาส / PT / พื้นที่",
    labelEn: "Bookings",
    roles: ALL_ROLES,
  },
  {
    href: "/members",
    icon: "card_membership",
    labelTh: "จัดการสมาชิก",
    labelEn: "Members",
    roles: ALL_ROLES,
  },
  {
    href: "/classes",
    icon: "fitness_center",
    labelTh: "คลาส & แพ็กเกจ",
    labelEn: "Classes & Packages",
    roles: ALL_ROLES,
  },
  {
    href: "/promotions/manage",
    icon: "sell",
    labelTh: "โปรโมชั่น",
    labelEn: "Promotions",
    roles: ["admin", "manager"],
  },
  {
    href: "/reports",
    icon: "analytics",
    labelTh: "รายงาน",
    labelEn: "Reports",
    roles: ALL_ROLES,
  },
  {
    href: "/staff",
    icon: "group",
    labelTh: "จัดการพนักงาน",
    labelEn: "Staff",
    roles: ["admin", "manager"],
  },
  {
    href: "/users",
    icon: "admin_panel_settings",
    labelTh: "ผู้ใช้งานระบบ",
    labelEn: "Users",
    roles: ["admin"],
  },
];

/** หน้าที่ทุกคนที่ login แล้วเข้าได้ ไม่ขึ้นกับ role */
const ALWAYS_ALLOWED = ["/profile", "/change-password", "/forbidden"];

export function isValidRole(role: string): role is AppUserRole {
  return role === "admin" || role === "manager" || role === "staff";
}

export function navItemsForRole(role: string): NavItem[] {
  if (!isValidRole(role)) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function canAccessPath(role: string, pathname: string): boolean {
  if (ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))) return true;
  if (!isValidRole(role)) return false;

  // จับ match ที่ยาวที่สุดก่อน เพื่อไม่ให้ "/" ครอบทุก path
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    );

  if (!match) return true;
  return match.roles.includes(role);
}

export type Permission =
  | "members.delete"
  | "members.grantAccess"
  | "classes.edit"
  | "promotions.edit"
  | "reports.sales"
  | "staff.manage"
  | "staff.grantAccess"
  | "users.manage";

const PERMISSIONS: Record<Permission, AppUserRole[]> = {
  "members.delete": ["admin", "manager"],
  "members.grantAccess": ["admin", "manager"],
  "classes.edit": ["admin", "manager"],
  "promotions.edit": ["admin", "manager"],
  "reports.sales": ["admin", "manager"],
  "staff.manage": ["admin", "manager"],
  // บัญชีที่สร้างจากหน้านี้ถูกบังคับเป็น role staff เสมอ manager จึงยกระดับสิทธิ์ใครไม่ได้
  "staff.grantAccess": ["admin", "manager"],
  "users.manage": ["admin"],
};

export function can(role: string, permission: Permission): boolean {
  if (!isValidRole(role)) return false;
  return PERMISSIONS[permission].includes(role);
}

export const roleLabels: Record<AppUserRole, { th: string; en: string }> = {
  admin: { th: "ผู้ดูแลระบบ", en: "Admin" },
  manager: { th: "ผู้จัดการ", en: "Manager" },
  staff: { th: "พนักงาน", en: "Staff" },
};
