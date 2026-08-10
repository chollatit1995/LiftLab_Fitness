import { AppData, Booking, Member, Sale } from "./types";
import { daysUntil, todayISO, toISODate } from "./dates";
import { bookingTypeLabels } from "./store";

export type ReportRange = { from: string; to: string };

export function inRange(date: string, range: ReportRange): boolean {
  const iso = toISODate(date);
  if (!iso) return false;
  return iso >= range.from && iso <= range.to;
}

export function defaultReportRange(today = todayISO()): ReportRange {
  const end = new Date(today + "T12:00:00");
  const start = new Date(end);
  start.setDate(end.getDate() - 29);
  return {
    from: start.toISOString().slice(0, 10),
    to: today,
  };
}

export function rangePresets(today = todayISO()): {
  key: string;
  label: string;
  range: ReportRange;
}[] {
  const end = new Date(today + "T12:00:00");
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const last7 = new Date(end);
  last7.setDate(end.getDate() - 6);

  const last30 = new Date(end);
  last30.setDate(end.getDate() - 29);

  const monthStart = `${today.slice(0, 7)}-01`;

  const prevMonthEnd = new Date(`${monthStart}T12:00:00`);
  prevMonthEnd.setDate(0);
  const prevMonthStart = `${prevMonthEnd.toISOString().slice(0, 7)}-01`;

  return [
    { key: "7d", label: "7 วัน", range: { from: iso(last7), to: today } },
    { key: "30d", label: "30 วัน", range: { from: iso(last30), to: today } },
    { key: "month", label: "เดือนนี้", range: { from: monthStart, to: today } },
    {
      key: "prev-month",
      label: "เดือนก่อน",
      range: { from: prevMonthStart, to: iso(prevMonthEnd) },
    },
  ];
}

const saleTypeLabel: Record<Sale["type"], string> = {
  membership: "สมาชิก",
  class: "คลาส",
  pt: "PT",
  other: "อื่นๆ",
};

const memberStatusLabel: Record<Member["status"], string> = {
  active: "ใช้งาน",
  expired: "หมดอายุ",
  pending: "รอดำเนินการ",
};

const bookingStatusLabel: Record<Booking["status"], string> = {
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

export function salesInRange(data: AppData, range: ReportRange): Sale[] {
  const memberIds = new Set(data.members.map((m) => m.id));
  return data.sales
    .filter((s) => memberIds.has(s.memberId) && inRange(s.date, range))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function bookingsInRange(data: AppData, range: ReportRange): Booking[] {
  return data.bookings
    .filter((b) => inRange(b.date, range))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.time.localeCompare(b.time) ||
        a.id.localeCompare(b.id)
    );
}

export function renewalsInRange(data: AppData, range: ReportRange) {
  return (data.membershipRenewals ?? [])
    .filter((r) => inRange(r.renewedAt, range))
    .sort((a, b) => b.renewedAt.localeCompare(a.renewedAt));
}

export function buildSalesSummary(sales: Sale[]) {
  const total = sales.reduce((sum, s) => sum + s.amount, 0);
  const byType = (Object.keys(saleTypeLabel) as Sale["type"][]).map((type) => {
    const rows = sales.filter((s) => s.type === type);
    return {
      type,
      label: saleTypeLabel[type],
      count: rows.length,
      amount: rows.reduce((sum, s) => sum + s.amount, 0),
    };
  });
  return { total, count: sales.length, byType };
}

export function buildBookingSummary(bookings: Booking[]) {
  const byStatus = (Object.keys(bookingStatusLabel) as Booking["status"][]).map(
    (status) => ({
      status,
      label: bookingStatusLabel[status],
      count: bookings.filter((b) => b.status === status).length,
    })
  );
  const byType = (["class", "trainer", "facility"] as Booking["type"][]).map(
    (type) => ({
      type,
      label: bookingTypeLabels[type].th,
      count: bookings.filter((b) => b.type === type).length,
    })
  );
  return { total: bookings.length, byStatus, byType };
}

export function buildMemberReport(data: AppData, today = todayISO()) {
  const expiringSoon = data.members
    .filter((m) => {
      if (m.status !== "active") return false;
      const left = daysUntil(m.expiresAt, today);
      return left >= 0 && left <= 14;
    })
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  const expired = data.members
    .filter((m) => m.status === "expired" || daysUntil(m.expiresAt, today) < 0)
    .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt));

  const newMembers = data.members
    .slice()
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));

  const byStatus = (Object.keys(memberStatusLabel) as Member["status"][]).map(
    (status) => ({
      status,
      label: memberStatusLabel[status],
      count: data.members.filter((m) => m.status === status).length,
    })
  );

  return { expiringSoon, expired, newMembers, byStatus };
}

export function buildPtReport(data: AppData, range: ReportRange) {
  const completedPt = data.bookings.filter(
    (b) =>
      b.type === "trainer" &&
      b.status === "completed" &&
      inRange(b.date, range)
  );

  const byTrainer = new Map<
    string,
    { trainerId: string; name: string; completed: number }
  >();

  for (const b of completedPt) {
    const trainer = data.staff.find((s) => s.id === b.resourceId);
    const name = trainer?.name ?? b.resourceName;
    const prev = byTrainer.get(b.resourceId) ?? {
      trainerId: b.resourceId,
      name,
      completed: 0,
    };
    prev.completed += 1;
    byTrainer.set(b.resourceId, prev);
  }

  const membersWithQuota = data.members
    .filter((m) => m.sessionsTotal != null && (m.sessionsTotal as number) > 0)
    .map((m) => {
      const total = m.sessionsTotal as number;
      const used = m.sessionsUsed ?? 0;
      return {
        ...m,
        sessionsTotal: total,
        sessionsUsed: used,
        remaining: Math.max(0, total - used),
      };
    })
    .sort((a, b) => a.remaining - b.remaining);

  return {
    completedCount: completedPt.length,
    byTrainer: [...byTrainer.values()].sort((a, b) => b.completed - a.completed),
    membersWithQuota,
  };
}

export function packageName(data: AppData, packageId: string): string {
  return data.packages.find((p) => p.id === packageId)?.name ?? "—";
}

export {
  saleTypeLabel,
  memberStatusLabel,
  bookingStatusLabel,
};
