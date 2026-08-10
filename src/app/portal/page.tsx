"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { daysUntil } from "@/lib/dates";
import { formatCurrency, formatDate, statusColors } from "@/lib/store";
import { MembershipPackage, Promotion } from "@/lib/types";
import {
  bestOfferFor,
  daysLeft,
  discountBadge,
  livePromotions,
  promotionsForPackage,
} from "@/lib/promotions";

interface PortalData {
  member: {
    id: string;
    name: string;
    email: string;
    phone: string;
    packageId: string;
    joinedAt: string;
    expiresAt: string;
    status: string;
  };
  package: {
    name: string;
    price: number;
    durationDays: number;
    features: string[];
  } | null;
  bookings: {
    id: string;
    type: string;
    resourceName: string;
    date: string;
    time: string;
    status: string;
  }[];
  promotions: Promotion[];
  packages: MembershipPackage[];
}

const statusLabels: Record<string, string> = {
  active: "ใช้งาน",
  pending: "รอดำเนินการ",
  expired: "หมดอายุ",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิก",
  completed: "เข้าร่วมแล้ว",
};

const typeLabels: Record<string, string> = {
  class: "คลาส",
  trainer: "เทรนเนอร์ (PT)",
  facility: "พื้นที่",
};

const typeIcons: Record<string, string> = {
  class: "fitness_center",
  trainer: "person",
  facility: "meeting_room",
};

function memberInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "M";
}

function membershipProgress(joinedAt: string, expiresAt: string) {
  const total = daysUntil(expiresAt, joinedAt);
  const remaining = daysUntil(expiresAt);
  if (!Number.isFinite(total) || total <= 0) return { percent: 0, remaining };
  const used = Math.max(0, total - (Number.isFinite(remaining) ? remaining : 0));
  const percent = Math.min(100, Math.max(0, Math.round((used / total) * 100)));
  return { percent, remaining };
}

function ProgressRing({
  percent,
  remaining,
  size = 88,
}: {
  percent: number;
  remaining: number;
  size?: number;
}) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color =
    remaining < 0
      ? "stroke-red-400"
      : remaining <= 7
        ? "stroke-amber-400"
        : "stroke-emerald-300";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={`${color} transition-all duration-700`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        {Number.isFinite(remaining) && remaining >= 0 ? (
          <>
            <span className="text-2xl font-bold leading-none">{remaining}</span>
            <span className="text-[10px] uppercase tracking-wide text-white/70">
              วัน
            </span>
          </>
        ) : (
          <span className="material-symbols-outlined text-[28px] text-red-300">
            event_busy
          </span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  accent = "brand",
}: {
  icon: string;
  title: string;
  subtitle?: string;
  accent?: "brand" | "rose" | "violet" | "sky";
}) {
  const accents = {
    brand: "bg-brand-100 text-brand-700",
    rose: "bg-rose-100 text-rose-600",
    violet: "bg-violet-100 text-violet-600",
    sky: "bg-sky-100 text-sky-600",
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}
      >
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <span className="material-symbols-outlined text-[28px] text-slate-400">
          {icon}
        </span>
      </div>
      <p className="max-w-xs text-sm leading-relaxed text-slate-500">{message}</p>
    </div>
  );
}

export default function PortalPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/me");
      const json = await res.json();
      if (json.member) setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleCancelBooking = async (bookingId: string) => {
    const res = await fetch(`/api/portal/bookings?id=${bookingId}`, {
      method: "DELETE",
    });
    if (res.ok) load();
  };

  const derived = useMemo(() => {
    if (!data) return null;
    const { member, bookings } = data;
    const remaining = daysUntil(member.expiresAt);
    const progress = membershipProgress(member.joinedAt, member.expiresAt);
    const promotions = livePromotions(data.promotions ?? []);
    const packages = data.packages ?? [];
    const myPromotions = promotionsForPackage(member.packageId, promotions);
    const otherPackages = packages.filter((p) => p.id !== member.packageId);
    const upcoming = bookings.filter((b) => b.status === "confirmed");
    const history = bookings.filter((b) => b.status !== "confirmed");

    return {
      member,
      remaining,
      progress,
      promotions,
      myPromotions,
      otherPackages,
      upcoming,
      history,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100">
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
        <div className="relative">
          <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-brand-600">
              fitness_center
            </span>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (!data || !derived) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50/30 px-6">
        <div className="card max-w-md p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <span className="material-symbols-outlined text-[32px] text-slate-400">
              person_off
            </span>
          </div>
          <p className="font-medium text-slate-800">ไม่พบข้อมูลสมาชิกของบัญชีนี้</p>
          <p className="mt-1 text-sm text-slate-500">กรุณาติดต่อเคาน์เตอร์</p>
          <button onClick={handleLogout} className="btn-secondary mt-6 w-full">
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  const {
    member,
    remaining,
    progress,
    promotions,
    myPromotions,
    otherPackages,
    upcoming,
    history,
  } = derived;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-emerald-50/25 to-slate-100">
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        rel="stylesheet"
      />

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-teal-200/20 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-emerald-500 text-white shadow-md shadow-brand-600/25">
              <span className="material-symbols-outlined text-[20px]">
                fitness_center
              </span>
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-slate-900">
                LiftLab Fitness
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-brand-600">
                Member Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/portal/change-password"
              className="hidden items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 sm:flex"
            >
              <span className="material-symbols-outlined text-[18px]">lock</span>
              เปลี่ยนรหัสผ่าน
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Welcome */}
        <section className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-emerald-500 text-xl font-bold text-white shadow-lg shadow-brand-600/30">
            {memberInitial(member.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-brand-600">ยินดีต้อนรับกลับ</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              สวัสดี, {member.name}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{member.email}</p>
          </div>
        </section>

        {/* Quick actions — จองคลาส & PT */}
        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/portal/book?tab=class"
            className="group flex items-center gap-4 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
              <span className="material-symbols-outlined text-[24px]">
                fitness_center
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">จองคลาส</p>
              <p className="text-xs text-slate-500">HIIT, Yoga, Spin และอื่นๆ</p>
            </div>
            <span className="material-symbols-outlined text-[20px] text-violet-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600">
              arrow_forward
            </span>
          </Link>
          <Link
            href="/portal/book?tab=trainer"
            className="group flex items-center gap-4 rounded-2xl border border-brand-200/80 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-emerald-500 text-white shadow-md">
              <span className="material-symbols-outlined text-[24px]">person</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">จองเทรนเนอร์ (PT)</p>
              <p className="text-xs text-slate-500">Personal Training 1-on-1</p>
            </div>
            <span className="material-symbols-outlined text-[20px] text-brand-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600">
              arrow_forward
            </span>
          </Link>
        </section>

        {/* Membership hero card */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-emerald-500 px-6 py-7 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white" />
              <div className="absolute -bottom-16 -left-8 h-56 w-56 rounded-full bg-white" />
            </div>

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                  แพ็กเกจปัจจุบัน
                </p>
                <p className="mt-1 truncate text-2xl font-bold text-white sm:text-3xl">
                  {data.package?.name ?? "ยังไม่มีแพ็กเกจ"}
                </p>
                {data.package && (
                  <p className="mt-1.5 text-sm text-white/80">
                    {formatCurrency(data.package.price)} · {data.package.durationDays}{" "}
                    วัน
                  </p>
                )}
                <div className="mt-4">
                  <Badge
                    label={statusLabels[member.status] ?? member.status}
                    className="bg-white/20 text-white backdrop-blur-sm"
                  />
                </div>
              </div>
              <ProgressRing
                percent={progress.percent}
                remaining={progress.remaining}
                size={96}
              />
            </div>
          </div>

          <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                icon: "calendar_today",
                label: "วันที่เริ่ม",
                value: formatDate(member.joinedAt),
                color: "text-slate-900",
              },
              {
                icon: "event",
                label: "วันหมดอายุ",
                value: formatDate(member.expiresAt),
                color: "text-slate-900",
              },
              {
                icon: "hourglass_top",
                label: "สถานะ",
                value:
                  Number.isNaN(remaining) || remaining < 0
                    ? "หมดอายุแล้ว"
                    : remaining === 0
                      ? "หมดอายุวันนี้"
                      : `เหลือ ${remaining} วัน`,
                color:
                  remaining < 0
                    ? "text-red-500"
                    : remaining <= 7
                      ? "text-amber-600"
                      : "text-emerald-600",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 px-6 py-5 transition hover:bg-slate-50/80"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <span className="material-symbols-outlined text-[18px]">
                    {stat.icon}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className={`mt-0.5 text-sm font-semibold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Expiry alert */}
        {Number.isFinite(remaining) && remaining >= 0 && remaining <= 7 && (
          <div className="mb-8 flex items-start gap-4 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <span className="material-symbols-outlined text-[22px] text-amber-600">
                schedule
              </span>
            </div>
            <div>
              <p className="font-semibold text-amber-900">ใกล้หมดอายุแล้ว!</p>
              <p className="mt-0.5 text-sm leading-relaxed text-amber-800/90">
                แพ็กเกจของคุณจะหมดอายุในอีก {remaining} วัน
                ติดต่อเคาน์เตอร์เพื่อต่ออายุได้เลย
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left column */}
          <div className="space-y-8 lg:col-span-3">
            {/* Upcoming bookings */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <SectionHeader
                  icon="event_upcoming"
                  title="การจองที่กำลังจะมาถึง"
                  subtitle="Upcoming Bookings"
                  accent="sky"
                />
              </div>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon="event_available"
                  message="ยังไม่มีการจอง — ติดต่อเคาน์เตอร์เพื่อจองคลาสหรือเทรนเนอร์"
                />
              ) : (
                <div className="space-y-3 p-4 sm:p-5">
                  {upcoming.map((booking) => (
                    <div
                      key={booking.id}
                      className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 text-white shadow-md shadow-brand-500/20">
                          <span className="material-symbols-outlined text-[22px]">
                            {typeIcons[booking.type] ?? "event"}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">
                            {booking.resourceName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {typeLabels[booking.type] ?? booking.type}
                          </p>
                        </div>
                        <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-slate-100">
                          <p className="text-sm font-semibold text-slate-800">
                            {formatDate(booking.date)}
                          </p>
                          <p className="text-xs text-brand-600">{booking.time}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="mt-3 w-full rounded-lg border border-red-200 bg-white py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        ยกเลิกการจอง
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* History */}
            {history.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <SectionHeader
                    icon="history"
                    title="ประวัติการเข้าใช้"
                    subtitle="Activity History"
                    accent="violet"
                  />
                </div>
                <div className="divide-y divide-slate-100">
                  {history.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50/80 sm:px-6"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <span className="material-symbols-outlined text-[18px]">
                            {typeIcons[booking.type] ?? "event"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {booking.resourceName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDate(booking.date)} · {booking.time}
                          </p>
                        </div>
                      </div>
                      <Badge
                        label={statusLabels[booking.status] ?? booking.status}
                        className={statusColors[booking.status] ?? ""}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Promotions */}
            {promotions.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <SectionHeader
                    icon="local_offer"
                    title="โปรโมชั่นสำหรับคุณ"
                    subtitle={
                      myPromotions.length > 0
                        ? `${myPromotions.length} โปรใช้ได้กับแพ็กเกจของคุณ`
                        : "โปรที่กำลังเปิดอยู่ทั้งหมด"
                    }
                    accent="rose"
                  />
                </div>
                <div className="space-y-3 p-4 sm:p-5">
                  {promotions.map((promo) => {
                    const usable = myPromotions.some((p) => p.id === promo.id);
                    const left = daysLeft(promo);

                    return (
                      <div
                        key={promo.id}
                        className={`relative overflow-hidden rounded-xl border p-4 transition hover:shadow-md ${
                          usable
                            ? "border-rose-200/80 bg-gradient-to-br from-rose-50/80 to-white"
                            : "border-slate-100 bg-slate-50/50"
                        }`}
                      >
                        {promo.highlight && (
                          <div className="absolute right-0 top-0 rounded-bl-xl bg-rose-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            แนะนำ
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">
                                {promo.title}
                              </p>
                              {usable && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  ใช้ได้
                                </span>
                              )}
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                              {promo.description}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                              {promo.code && (
                                <span className="rounded-lg border border-dashed border-rose-300 bg-white px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-rose-700">
                                  {promo.code}
                                </span>
                              )}
                              <span className="text-slate-400">
                                ถึง {formatDate(promo.endDate)}
                                {left >= 0 && left <= 14 && ` · เหลือ ${left} วัน`}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-xl bg-rose-500 px-3 py-1.5 text-sm font-bold text-white shadow-sm">
                            {discountBadge(promo)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-8 lg:col-span-2">
            {/* Package benefits */}
            {data.package && data.package.features.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5">
                  <SectionHeader
                    icon="verified"
                    title="สิทธิ์ในแพ็กเกจ"
                    subtitle="Package Benefits"
                  />
                </div>
                <ul className="space-y-1 p-4">
                  {data.package.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-brand-50/50"
                    >
                      <span className="material-symbols-outlined mt-0.5 text-[20px] text-brand-500">
                        check_circle
                      </span>
                      <span className="text-sm leading-relaxed text-slate-700">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Contact card */}
            <section className="overflow-hidden rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50 to-emerald-50/80 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <span className="material-symbols-outlined text-[22px]">
                    support_agent
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">ต้องการความช่วยเหลือ?</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    ติดต่อเคาน์เตอร์ LiftLab เพื่อต่ออายุ จองคลาส หรือสอบถามโปรโมชั่น
                  </p>
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        call
                      </span>
                      {member.phone}
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* Other packages */}
            {otherPackages.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5">
                  <SectionHeader
                    icon="card_membership"
                    title="แพ็กเกจอื่น"
                    subtitle="ราคาหลังหักโปรแล้ว"
                  />
                </div>
                <div className="space-y-3 p-4">
                  {otherPackages.map((pkg) => {
                    const offer = bestOfferFor(pkg, promotions);

                    return (
                      <div
                        key={pkg.id}
                        className={`rounded-xl border p-4 transition hover:shadow-md ${
                          pkg.popular
                            ? "border-brand-200 bg-gradient-to-br from-brand-50/60 to-white ring-1 ring-brand-100"
                            : "border-slate-100 bg-slate-50/40 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{pkg.name}</p>
                          {pkg.popular && (
                            <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                              แนะนำ
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {pkg.durationDays} วัน
                        </p>
                        <div className="mt-2 flex items-baseline gap-2">
                          {offer ? (
                            <>
                              <span className="text-xl font-bold text-rose-600">
                                {formatCurrency(offer.price)}
                              </span>
                              <span className="text-sm text-slate-400 line-through">
                                {formatCurrency(pkg.price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-xl font-bold text-slate-900">
                              {formatCurrency(pkg.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <p className="px-1 text-center text-[11px] text-slate-400">
                    สนใจแจ้งที่เคาน์เตอร์
                  </p>
                </div>
              </section>
            )}

            {/* Mobile change password */}
            <Link
              href="/portal/change-password"
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 sm:hidden"
            >
              <span className="material-symbols-outlined text-[20px]">lock</span>
              เปลี่ยนรหัสผ่าน
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative border-t border-slate-200/60 bg-white/60 py-8 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <span className="material-symbols-outlined text-[16px]">
                fitness_center
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-700">
              LiftLab Fitness
            </span>
          </div>
          <p className="text-xs text-slate-400">© 2026 LiftLab Fitness · Member Portal</p>
        </div>
      </footer>
    </div>
  );
}
