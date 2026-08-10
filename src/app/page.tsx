"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { useData } from "@/lib/data-context";
import { daysUntil, todayISO } from "@/lib/dates";
import {
  formatCurrency,
  formatDate,
  statusColors,
  bookingTypeLabels,
} from "@/lib/store";
import { can } from "@/lib/permissions";
import Link from "next/link";

const EXPIRING_SOON_DAYS = 7;

function greetingFor(hour: number): string {
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

const quickActionStyles: Record<string, { gradient: string; border: string }> = {
  person_add: { gradient: "from-brand-600 to-emerald-500", border: "hover:border-brand-300" },
  event_available: { gradient: "from-sky-500 to-blue-600", border: "hover:border-sky-300" },
  fitness_center: { gradient: "from-violet-500 to-purple-600", border: "hover:border-violet-300" },
  group_add: { gradient: "from-orange-500 to-amber-500", border: "hover:border-orange-300" },
};

export default function DashboardPage() {
  const { data, hydrated } = useData();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [greeting, setGreeting] = useState("สวัสดี");

  useEffect(() => {
    setGreeting(greetingFor(new Date().getHours()));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  const stats = useMemo(() => {
    const memberIds = new Set(data.members.map((m) => m.id));
    const linkedSales = data.sales.filter((s) => memberIds.has(s.memberId));

    const activeMembers = data.members.filter((m) => m.status === "active").length;
    const activeClasses = data.classes.filter((c) => c.status === "active").length;
    const totalSales = linkedSales.reduce((sum, s) => sum + s.amount, 0);
    const today = todayISO();
    const monthPrefix = today.slice(0, 7);
    const todayBookings = data.bookings.filter(
      (b) => b.date === today && b.status === "confirmed"
    ).length;
    const monthlySales = linkedSales
      .filter((s) => s.date.startsWith(monthPrefix))
      .reduce((sum, s) => sum + s.amount, 0);

    const newMembersThisMonth = data.members.filter((m) =>
      m.joinedAt.startsWith(monthPrefix)
    ).length;

    return {
      activeMembers,
      activeClasses,
      totalSales,
      todayBookings,
      monthlySales,
      newMembersThisMonth,
    };
  }, [data]);

  const alerts = useMemo(() => {
    const today = todayISO();
    const expiringSoon = data.members.filter((m) => {
      if (m.status !== "active") return false;
      const left = daysUntil(m.expiresAt, today);
      return left >= 0 && left <= EXPIRING_SOON_DAYS;
    });
    const expired = data.members.filter((m) => m.status === "expired");
    const todayBookings = data.bookings.filter(
      (b) => b.date === today && b.status === "confirmed"
    );
    return { expiringSoon, expired, todayBookings };
  }, [data]);

  const recentSales = useMemo(() => {
    const memberIds = new Set(data.members.map((m) => m.id));
    return [...data.sales]
      .filter((s) => memberIds.has(s.memberId))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [data.members, data.sales]);

  const upcomingBookings = data.bookings
    .filter((b) => b.status === "confirmed")
    .slice(0, 5);

  const quickActions = [
    { href: "/members", icon: "person_add", label: "เพิ่มสมาชิก", sub: "Members", visible: true },
    { href: "/bookings", icon: "event_available", label: "สร้างการจอง", sub: "Bookings", visible: true },
    { href: "/classes", icon: "fitness_center", label: "จัดการคลาส", sub: "Classes", visible: user ? can(user.role, "classes.edit") : false },
    { href: "/staff", icon: "group_add", label: "จัดการพนักงาน", sub: "Staff", visible: user ? can(user.role, "staff.manage") : false },
  ].filter((a) => a.visible);

  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="relative">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero banner */}
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 p-6 text-white shadow-xl shadow-slate-900/20 sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white" />
          <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-emerald-300" />
        </div>
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300/90">
              {greeting}{user ? `, ${user.name}` : ""}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              แดชบอร์ด LiftLab Fitness
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-300">
              สรุปคลาส สมาชิก การจอง และยอดขาย — ภาพรวมทั้งหมดในที่เดียว
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-center backdrop-blur-sm ring-1 ring-white/10">
              <p className="text-2xl font-bold">{stats.activeMembers}</p>
              <p className="text-xs text-slate-300">สมาชิก Active</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-center backdrop-blur-sm ring-1 ring-white/10">
              <p className="text-2xl font-bold">{stats.todayBookings}</p>
              <p className="text-xs text-slate-300">จองวันนี้</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const style = quickActionStyles[action.icon] ?? quickActionStyles.person_add;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`card-hover group flex items-center gap-4 p-4 ${style.border}`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.gradient} text-white shadow-md transition group-hover:scale-105`}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {action.icon}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{action.label}</p>
                <p className="text-xs text-slate-400">{action.sub}</p>
              </div>
              <span className="material-symbols-outlined ml-auto text-[18px] text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500">
                arrow_forward
              </span>
            </Link>
          );
        })}
      </div>

      {/* Alerts */}
      {(alerts.expiringSoon.length > 0 ||
        alerts.expired.length > 0 ||
        alerts.todayBookings.length > 0) && (
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {alerts.todayBookings.length > 0 && (
            <Link
              href="/bookings"
              className="group flex items-start gap-4 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-white p-4 transition hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white">
                <span className="material-symbols-outlined text-[20px]">today</span>
              </div>
              <div>
                <p className="font-semibold text-sky-900">
                  การจอง {alerts.todayBookings.length} รายการวันนี้
                </p>
                <p className="text-xs text-sky-700">ดูตารางการจอง →</p>
              </div>
            </Link>
          )}
          {alerts.expiringSoon.length > 0 && (
            <Link
              href="/members"
              className="group flex items-start gap-4 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-4 transition hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <div>
                <p className="font-semibold text-amber-900">
                  {alerts.expiringSoon.length} คนใกล้หมดอายุ
                </p>
                <p className="text-xs text-amber-700">
                  ภายใน {EXPIRING_SOON_DAYS} วัน
                </p>
              </div>
            </Link>
          )}
          {alerts.expired.length > 0 && (
            <Link
              href="/members"
              className="group flex items-start gap-4 rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50 to-white p-4 transition hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
                <span className="material-symbols-outlined text-[20px]">error</span>
              </div>
              <div>
                <p className="font-semibold text-red-900">
                  หมดอายุ {alerts.expired.length} คน
                </p>
                <p className="text-xs text-red-700">รอการต่ออายุ</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="groups"
          labelTh="สมาชิกที่ใช้งาน"
          labelEn="Active Members"
          value={stats.activeMembers}
          change={
            stats.newMembersThisMonth > 0
              ? `+${stats.newMembersThisMonth} เดือนนี้`
              : undefined
          }
          changeType="up"
          accent="green"
        />
        <StatCard
          icon="fitness_center"
          labelTh="คลาสที่เปิดสอน"
          labelEn="Active Classes"
          value={stats.activeClasses}
          accent="blue"
        />
        <StatCard
          icon="payments"
          labelTh="ยอดขายเดือนนี้"
          labelEn="Monthly Sales"
          value={formatCurrency(stats.monthlySales)}
          accent="purple"
        />
        <StatCard
          icon="event"
          labelTh="การจองวันนี้"
          labelEn="Today's Bookings"
          value={stats.todayBookings}
          accent="orange"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent sales */}
        <div className="card overflow-hidden">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>
              <div>
                <h2 className="section-title">ยอดขายล่าสุด</h2>
                <p className="text-xs text-slate-500">Recent Sales</p>
              </div>
            </div>
            <p className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
              {formatCurrency(stats.totalSales)}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSales.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-400">
                ยังไม่มียอดขาย
              </p>
            ) : (
              recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between px-5 py-3.5 transition hover:bg-slate-50/80 sm:px-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                      {sale.memberName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {sale.memberName}
                      </p>
                      <p className="text-xs text-slate-500">{sale.item}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(sale.amount)}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(sale.date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming bookings */}
        <div className="card overflow-hidden">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <span className="material-symbols-outlined text-[20px]">event_upcoming</span>
              </div>
              <div>
                <h2 className="section-title">การจองที่กำลังจะมาถึง</h2>
                <p className="text-xs text-slate-500">Upcoming Bookings</p>
              </div>
            </div>
            <Link
              href="/bookings"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingBookings.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-400">
                ยังไม่มีการจอง
              </p>
            ) : (
              upcomingBookings.map((booking) => {
                const member = data.members.find((m) => m.id === booking.memberId);
                const icon =
                  booking.type === "class"
                    ? "fitness_center"
                    : booking.type === "trainer"
                      ? "person"
                      : "meeting_room";
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between px-5 py-3.5 transition hover:bg-slate-50/80 sm:px-6"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 text-white">
                        <span className="material-symbols-outlined text-[18px]">
                          {icon}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {booking.resourceName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {member?.name} · {bookingTypeLabels[booking.type].th}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-right ring-1 ring-slate-100">
                      <p className="text-xs font-semibold text-slate-700">
                        {formatDate(booking.date)}
                      </p>
                      <p className="text-[11px] text-brand-600">{booking.time}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Class overview */}
      <div className="card mt-6 overflow-hidden">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <span className="material-symbols-outlined text-[20px]">fitness_center</span>
            </div>
            <div>
              <h2 className="section-title">คลาสที่เปิดสอน</h2>
              <p className="text-xs text-slate-500">Active Classes Overview</p>
            </div>
          </div>
          <Link
            href="/classes"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            จัดการคลาส →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-semibold sm:px-6">คลาส</th>
                <th className="px-5 py-3 font-semibold">เทรนเนอร์</th>
                <th className="hidden px-5 py-3 font-semibold md:table-cell">ตาราง</th>
                <th className="px-5 py-3 font-semibold">ที่นั่ง</th>
                <th className="px-5 py-3 font-semibold">ราคา</th>
                <th className="px-5 py-3 font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.classes.map((cls) => {
                const trainer = data.staff.find((s) => s.id === cls.trainerId);
                return (
                  <tr key={cls.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 sm:px-6">
                      <p className="font-semibold text-slate-900">{cls.name}</p>
                      <p className="text-xs text-slate-400">{cls.duration} นาที</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {trainer?.name ?? "—"}
                    </td>
                    <td className="hidden px-5 py-3.5 text-slate-600 md:table-cell">
                      {cls.schedule}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{cls.capacity}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {formatCurrency(cls.price)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        label={cls.status === "active" ? "เปิดสอน" : "ปิด"}
                        className={statusColors[cls.status]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member summary */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
            <div>
              <h2 className="section-title">สรุปสมาชิก</h2>
              <p className="text-xs text-slate-500">Member Summary</p>
            </div>
          </div>
          <Link
            href="/members"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            จัดการสมาชิก →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              count: data.members.filter((m) => m.status === "active").length,
              label: "สมาชิก Active",
              color: "text-emerald-600",
              bg: "from-emerald-50 to-white border-emerald-100",
              icon: "check_circle",
            },
            {
              count: data.members.filter((m) => m.status === "pending").length,
              label: "รอดำเนินการ",
              color: "text-amber-600",
              bg: "from-amber-50 to-white border-amber-100",
              icon: "pending",
            },
            {
              count: data.members.filter((m) => m.status === "expired").length,
              label: "หมดอายุ",
              color: "text-red-500",
              bg: "from-red-50 to-white border-red-100",
              icon: "event_busy",
            },
          ].map((item) => (
            <Link
              key={item.label}
              href="/members"
              className={`card-hover flex items-center gap-4 border bg-gradient-to-br p-5 ${item.bg}`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ${item.color}`}>
                <span className="material-symbols-outlined text-[24px]">
                  {item.icon}
                </span>
              </div>
              <div>
                <p className={`text-3xl font-bold ${item.color}`}>{item.count}</p>
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
