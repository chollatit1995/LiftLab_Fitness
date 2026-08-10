"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MembershipPackage, Promotion } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/store";
import {
  bestOfferFor,
  daysLeft,
  discountBadge,
  promotionsForPackage,
} from "@/lib/promotions";

interface OfferData {
  promotions: Promotion[];
  packages: MembershipPackage[];
}

const discountStyles: Record<Promotion["discountType"], string> = {
  percent: "bg-rose-500",
  amount: "bg-amber-500",
  gift: "bg-brand-600",
};

function PromotionCard({ promo }: { promo: Promotion }) {
  const left = daysLeft(promo);

  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="font-bold text-slate-900">{promo.title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            ถึง {formatDate(promo.endDate)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold text-white ${discountStyles[promo.discountType]}`}
        >
          {discountBadge(promo)}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 py-4">
        <p className="flex-1 text-sm leading-relaxed text-slate-600">
          {promo.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {promo.code && (
            <span className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-slate-700">
              {promo.code}
            </span>
          )}
          {left >= 0 && left <= 14 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
              <span className="material-symbols-outlined text-[14px]">
                schedule
              </span>
              {left === 0 ? "วันสุดท้าย" : `เหลืออีก ${left} วัน`}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function PublicPromotionsPage() {
  const [data, setData] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/promotions");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const promotions = data?.promotions ?? [];
  const packages = data?.packages ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        rel="stylesheet"
      />

      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <span className="material-symbols-outlined text-[20px]">
                fitness_center
              </span>
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">
                LiftLab Fitness
              </p>
              <p className="text-xs text-slate-500">โปรโมชั่นและแพ็กเกจ</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-brand-600"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            <span className="hidden sm:inline">เข้าสู่ระบบ</span>
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            โปรโมชั่นที่ใช้ได้ตอนนี้
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            รวมส่วนลดและสิทธิพิเศษทั้งหมดของ LiftLab Fitness
            แจ้งชื่อโปรที่เคาน์เตอร์ได้เลย
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="mb-10">
              <h2 className="section-title">โปรโมชั่นทั้งหมด</h2>
              <p className="mb-4 text-xs text-slate-500">Current Promotions</p>

              {promotions.length === 0 ? (
                <div className="card px-5 py-12 text-center">
                  <span className="material-symbols-outlined text-[36px] text-slate-300">
                    sell
                  </span>
                  <p className="mt-2 text-sm text-slate-500">
                    ตอนนี้ยังไม่มีโปรโมชั่นที่กำลังใช้งาน
                    ติดตามได้เร็วๆ นี้
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {promotions.map((promo) => (
                    <PromotionCard key={promo.id} promo={promo} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="section-title">แพ็กเกจสมาชิก</h2>
              <p className="mb-4 text-xs text-slate-500">
                ราคาด้านล่างคิดส่วนลดจากโปรที่ใช้ได้ให้แล้ว
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {packages.map((pkg) => {
                  const offer = bestOfferFor(pkg, promotions);
                  const applicable = promotionsForPackage(pkg.id, promotions);

                  return (
                    <article
                      key={pkg.id}
                      className={`card flex h-full flex-col p-5 ${
                        pkg.popular ? "ring-2 ring-brand-500" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">{pkg.name}</h3>
                        {pkg.popular && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                            แนะนำ
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {pkg.durationDays} วัน
                      </p>

                      <div className="mt-3">
                        {offer ? (
                          <>
                            <p className="text-sm text-slate-400 line-through">
                              {formatCurrency(pkg.price)}
                            </p>
                            <p className="text-2xl font-bold text-rose-600">
                              {formatCurrency(offer.price)}
                            </p>
                            <p className="mt-0.5 text-xs font-medium text-rose-500">
                              ประหยัด {formatCurrency(offer.saved)}
                            </p>
                          </>
                        ) : (
                          <p className="text-2xl font-bold text-slate-900">
                            {formatCurrency(pkg.price)}
                          </p>
                        )}
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-slate-600">
                        {pkg.description}
                      </p>

                      <ul className="mt-3 flex-1 space-y-1.5">
                        {pkg.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-1.5 text-xs text-slate-600"
                          >
                            <span className="material-symbols-outlined text-[15px] text-brand-600">
                              check
                            </span>
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {applicable.length > 0 && (
                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            โปรที่ใช้ได้
                          </p>
                          <ul className="space-y-1">
                            {applicable.map((promo) => (
                              <li
                                key={promo.id}
                                className="flex items-start gap-1.5 text-xs text-slate-600"
                              >
                                <span className="material-symbols-outlined text-[15px] text-rose-500">
                                  local_offer
                                </span>
                                {promo.title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-sm text-slate-600">
            สนใจสมัครหรือสอบถามเพิ่มเติม ติดต่อเคาน์เตอร์ได้ทุกวัน
          </p>
          <p className="mt-3 text-xs text-slate-400">
            © 2026 LiftLab Fitness
          </p>
        </div>
      </footer>
    </div>
  );
}
