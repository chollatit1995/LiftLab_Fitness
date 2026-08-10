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
    const activeMembers = data.members.filter((m) => m.status === "active").length;
    const activeClasses = data.classes.filter((c) => c.status === "active").length;
    const totalSales = data.sales.reduce((sum, s) => sum + s.amount, 0);
    const today = new Date().toISOString().split("T")[0];
    const monthPrefix = today.slice(0, 7);
    const todayBookings = data.bookings.filter(
      (b) => b.date === today && b.status === "confirmed"
    ).length;
    const monthlySales = data.sales
      .filter((s) => s.date.startsWith(monthPrefix))
      .reduce((sum, s) => sum + s.amount, 0);

    return { activeMembers, activeClasses, totalSales, todayBookings, monthlySales };
  }, [data]);

  const alerts = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
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

  const recentSales = [...data.sales]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const upcomingBookings = data.bookings
    .filter((b) => b.status === "confirmed")
    .slice(0, 5);

  const quickActions = [
    {
      href: "/members",
      icon: "person_add",
      label: "เพิ่มสมาชิก",
      visible: true,
    },
    {
      href: "/bookings",
      icon: "event_available",
      label: "สร้างการจอง",
      visible: true,
    },
    {
      href: "/classes",
      icon: "fitness_center",
      label: "จัดการคลาส",
      visible: user ? can(user.role, "classes.edit") : false,
    },
    {
      href: "/staff",
      icon: "group_add",
      label: "จัดการพนักงาน",
      visible: user ? can(user.role, "staff.manage") : false,
    },
  ].filter((action) => action.visible);

  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        titleTh={user ? `${greeting}, ${user.name}` : "แดชบอร์ดสรุปภาพรวม"}
        titleEn="Dashboard Overview"
        descriptionTh="สรุปคลาส สมาชิก และยอดขายของ LiftLab Fitness"
        descriptionEn="Classes, members, and sales summary for LiftLab Fitness"
      />

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          >
            <span className="material-symbols-outlined text-[18px]">
              {action.icon}
            </span>
            {action.label}
          </Link>
        ))}
      </div>

      {/* Alerts */}
      {(alerts.expiringSoon.length > 0 ||
        alerts.expired.length > 0 ||
        alerts.todayBookings.length > 0) && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {alerts.todayBookings.length > 0 && (
            <Link
              href="/bookings"
              className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 transition hover:bg-blue-100"
            >
              <span className="material-symbols-outlined text-[20px] text-blue-600">
                today
              </span>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  มีการจอง {alerts.todayBookings.length} รายการวันนี้
                </p>
                <p className="text-xs text-blue-700">ดูตารางการจอง</p>
              </div>
            </Link>
          )}
          {alerts.expiringSoon.length > 0 && (
            <Link
              href="/members"
              className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100"
            >
              <span className="material-symbols-outlined text-[20px] text-amber-600">
                schedule
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  สมาชิก {alerts.expiringSoon.length} คนใกล้หมดอายุ
                </p>
                <p className="text-xs text-amber-700">
                  ภายใน {EXPIRING_SOON_DAYS} วัน — ติดต่อต่ออายุ
                </p>
              </div>
            </Link>
          )}
          {alerts.expired.length > 0 && (
            <Link
              href="/members"
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 transition hover:bg-red-100"
            >
              <span className="material-symbols-outlined text-[20px] text-red-500">
                error
              </span>
              <div>
                <p className="text-sm font-semibold text-red-900">
                  สมาชิกหมดอายุ {alerts.expired.length} คน
                </p>
                <p className="text-xs text-red-700">รอการต่ออายุ</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="groups"
          labelTh="สมาชิกที่ใช้งาน"
          labelEn="Active Members"
          value={stats.activeMembers}
          change="+2 เดือนนี้"
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
          change="+12% vs เดือนก่อน"
          changeType="up"
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
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="section-title">ยอดขายล่าสุด</h2>
              <p className="text-xs text-slate-500">Recent Sales</p>
            </div>
            <p className="text-sm font-bold text-brand-600">
              รวม {formatCurrency(stats.totalSales)}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {sale.memberName}
                  </p>
                  <p className="text-xs text-slate-500">{sale.item}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(sale.amount)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(sale.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming bookings */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="section-title">การจองที่กำลังจะมาถึง</h2>
              <p className="text-xs text-slate-500">Upcoming Bookings</p>
            </div>
            <Link
              href="/bookings"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingBookings.map((booking) => {
              const member = data.members.find((m) => m.id === booking.memberId);
              return (
                <div
                  key={booking.id}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <span className="material-symbols-outlined text-[18px]">
                        {booking.type === "class"
                          ? "fitness_center"
                          : booking.type === "trainer"
                            ? "person"
                            : "meeting_room"}
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
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(booking.date)}
                    </p>
                    <p className="text-xs text-slate-400">{booking.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Class overview */}
      <div className="card mt-6">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="section-title">คลาสที่เปิดสอน</h2>
          <p className="text-xs text-slate-500">Active Classes Overview</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">คลาส / Class</th>
                <th className="px-5 py-3 font-medium">เทรนเนอร์ / Trainer</th>
                <th className="px-5 py-3 font-medium">ตาราง / Schedule</th>
                <th className="px-5 py-3 font-medium">ที่นั่ง / Capacity</th>
                <th className="px-5 py-3 font-medium">ราคา / Price</th>
                <th className="px-5 py-3 font-medium">สถานะ / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.classes.map((cls) => {
                const trainer = data.staff.find((s) => s.id === cls.trainerId);
                return (
                  <tr key={cls.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{cls.name}</p>
                      <p className="text-xs text-slate-400">{cls.duration} นาที</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {trainer?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{cls.schedule}</td>
                    <td className="px-5 py-3.5 text-slate-600">{cls.capacity}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
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
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="section-title">สรุปสมาชิก</h2>
            <p className="text-xs text-slate-500">Member Summary</p>
          </div>
          <Link
            href="/members"
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            จัดการสมาชิก →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/members" className="card p-5 text-center transition hover:bg-slate-50">
            <p className="text-3xl font-bold text-emerald-600">
              {data.members.filter((m) => m.status === "active").length}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">สมาชิก Active</p>
          </Link>
          <Link href="/members" className="card p-5 text-center transition hover:bg-slate-50">
            <p className="text-3xl font-bold text-amber-600">
              {data.members.filter((m) => m.status === "pending").length}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">รอดำเนินการ</p>
          </Link>
          <Link href="/members" className="card p-5 text-center transition hover:bg-slate-50">
            <p className="text-3xl font-bold text-red-500">
              {data.members.filter((m) => m.status === "expired").length}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">หมดอายุ</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
