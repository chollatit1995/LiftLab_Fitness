"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
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

function daysUntil(dateStr: string): number {
  const today = new Date(new Date().toISOString().split("T")[0] + "T00:00:00");
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="card max-w-md p-8 text-center">
          <p className="text-slate-700">ไม่พบข้อมูลสมาชิกของบัญชีนี้</p>
          <button onClick={handleLogout} className="btn-secondary mt-5 w-full">
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  const { member, bookings } = data;
  const remaining = daysUntil(member.expiresAt);
  const upcoming = bookings.filter((b) => b.status === "confirmed");
  const history = bookings.filter((b) => b.status !== "confirmed");

  const promotions = livePromotions(data.promotions ?? []);
  const packages = data.packages ?? [];
  const myPromotions = promotionsForPackage(member.packageId, promotions);
  const otherPackages = packages.filter((p) => p.id !== member.packageId);

  return (
    <div className="min-h-screen bg-slate-50">
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        rel="stylesheet"
      />

      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <span className="material-symbols-outlined text-[20px]">
                fitness_center
              </span>
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">LiftLab Fitness</p>
              <p className="text-xs text-slate-500">สมาชิก</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-red-600"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            สวัสดี, {member.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{member.email}</p>
        </div>

        {/* สถานะสมาชิก */}
        <div className="card mb-6 overflow-hidden">
          <div className="bg-gradient-to-br from-brand-700 to-brand-500 px-5 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">
                  แพ็กเกจปัจจุบัน
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {data.package?.name ?? "ยังไม่มีแพ็กเกจ"}
                </p>
                {data.package && (
                  <p className="mt-0.5 text-sm text-white/80">
                    {formatCurrency(data.package.price)} ·{" "}
                    {data.package.durationDays} วัน
                  </p>
                )}
              </div>
              <Badge
                label={statusLabels[member.status] ?? member.status}
                className="bg-white/20 text-white"
              />
            </div>
          </div>

          <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
            <div className="bg-white px-5 py-4">
              <p className="text-xs text-slate-500">วันที่เริ่ม</p>
              <p className="mt-0.5 font-semibold text-slate-900">
                {formatDate(member.joinedAt)}
              </p>
            </div>
            <div className="bg-white px-5 py-4">
              <p className="text-xs text-slate-500">วันหมดอายุ</p>
              <p className="mt-0.5 font-semibold text-slate-900">
                {formatDate(member.expiresAt)}
              </p>
            </div>
            <div className="bg-white px-5 py-4">
              <p className="text-xs text-slate-500">คงเหลือ</p>
              <p
                className={`mt-0.5 font-semibold ${
                  remaining < 0
                    ? "text-red-500"
                    : remaining <= 7
                      ? "text-amber-600"
                      : "text-emerald-600"
                }`}
              >
                {remaining < 0
                  ? "หมดอายุแล้ว"
                  : remaining === 0
                    ? "หมดอายุวันนี้"
                    : `${remaining} วัน`}
              </p>
            </div>
          </div>
        </div>

        {remaining >= 0 && remaining <= 7 && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="material-symbols-outlined text-[20px] text-amber-600">
              schedule
            </span>
            <p className="text-sm text-amber-800">
              แพ็กเกจของคุณใกล้หมดอายุแล้ว ติดต่อเคาน์เตอร์เพื่อต่ออายุได้เลย
            </p>
          </div>
        )}

        {data.package && data.package.features.length > 0 && (
          <div className="card mb-6 p-5">
            <h2 className="section-title">สิทธิ์ในแพ็กเกจ</h2>
            <p className="mb-4 text-xs text-slate-500">Package Benefits</p>
            <ul className="space-y-2">
              {data.package.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="material-symbols-outlined text-[18px] text-brand-600">
                    check_circle
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {promotions.length > 0 && (
          <div className="card mb-6">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="section-title">โปรโมชั่นสำหรับคุณ</h2>
                <p className="text-xs text-slate-500">
                  {myPromotions.length > 0
                    ? `${myPromotions.length} โปรใช้ได้กับแพ็กเกจของคุณ`
                    : "โปรที่กำลังเปิดอยู่ทั้งหมด"}
                </p>
              </div>
              <span className="material-symbols-outlined text-[22px] text-rose-500">
                local_offer
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {promotions.map((promo) => {
                const usable = myPromotions.some((p) => p.id === promo.id);
                const left = daysLeft(promo);

                return (
                  <div key={promo.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {promo.title}
                          </p>
                          {usable && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              ใช้กับแพ็กเกจคุณได้
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {promo.description}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {promo.code && (
                            <span className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-0.5 font-mono font-semibold text-slate-700">
                              {promo.code}
                            </span>
                          )}
                          <span className="text-slate-400">
                            ถึง {formatDate(promo.endDate)}
                            {left >= 0 && left <= 14 && ` · เหลือ ${left} วัน`}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1 text-sm font-bold text-rose-600">
                        {discountBadge(promo)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {otherPackages.length > 0 && (
          <div className="card mb-6">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">แพ็กเกจอื่นที่เปิดขาย</h2>
              <p className="text-xs text-slate-500">
                ราคาคิดส่วนลดจากโปรที่ใช้ได้ให้แล้ว สนใจแจ้งที่เคาน์เตอร์
              </p>
            </div>
            <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
              {otherPackages.map((pkg) => {
                const offer = bestOfferFor(pkg, promotions);

                return (
                  <div key={pkg.id} className="bg-white px-5 py-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">{pkg.name}</p>
                      {pkg.popular && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
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
                          <span className="text-lg font-bold text-rose-600">
                            {formatCurrency(offer.price)}
                          </span>
                          <span className="text-sm text-slate-400 line-through">
                            {formatCurrency(pkg.price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-slate-900">
                          {formatCurrency(pkg.price)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card mb-6">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="section-title">การจองที่กำลังจะมาถึง</h2>
            <p className="text-xs text-slate-500">Upcoming Bookings</p>
          </div>
          {upcoming.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              ยังไม่มีการจอง — ติดต่อเคาน์เตอร์เพื่อจองคลาสหรือเทรนเนอร์
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <span className="material-symbols-outlined text-[18px]">
                        {typeIcons[booking.type] ?? "event"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {booking.resourceName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {typeLabels[booking.type] ?? booking.type}
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
              ))}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="card">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">ประวัติการเข้าใช้</h2>
              <p className="text-xs text-slate-500">History</p>
            </div>
            <div className="divide-y divide-slate-100">
              {history.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm text-slate-700">
                      {booking.resourceName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(booking.date)} · {booking.time}
                    </p>
                  </div>
                  <Badge
                    label={statusLabels[booking.status] ?? booking.status}
                    className={statusColors[booking.status] ?? ""}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-slate-500 sm:px-6">
          © 2026 LiftLab Fitness
        </div>
      </footer>
    </div>
  );
}
