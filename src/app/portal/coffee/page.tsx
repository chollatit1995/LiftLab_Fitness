"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CoffeeStampCard } from "@/components/CoffeeStampCard";
import { BrandLogo } from "@/components/BrandLogo";
import {
  CoffeeLoyalty,
  CoffeeLoyaltyEvent,
  STAMPS_PER_FREE,
  canRedeemFree,
  eventTypeLabel,
} from "@/lib/coffee-loyalty";
import { formatDate } from "@/lib/store";

interface PortalCoffeeData {
  member: { id: string; name: string; email: string };
  loyalty: CoffeeLoyalty;
  events: CoffeeLoyaltyEvent[];
}

export default function PortalCoffeePage() {
  const [data, setData] = useState<PortalCoffeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/coffee", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      setData(json);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-amber-50 to-orange-50 px-6">
        <p className="text-sm text-red-600">{error || "โหลดข้อมูลไม่สำเร็จ"}</p>
        <button
          onClick={load}
          className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-medium text-white"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  const ready = canRedeemFree(data.loyalty.stamps);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/40 to-slate-100">
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        rel="stylesheet"
      />

      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <Link href="/portal" className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            กลับ
          </Link>
          <div className="flex items-center gap-2">
            <BrandLogo size={32} />
            <span className="text-sm font-bold text-slate-800">Liftlab Coffee</span>
          </div>
          <div className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 sm:py-8">
        <CoffeeStampCard
          stamps={data.loyalty.stamps}
          memberName={data.member.name}
        />

        <section className="mt-6 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">วิธีใช้งาน</p>
          <ol className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
            <li>1. สั่งกาแฟที่เคาน์เตอร์ Liftlab Coffee</li>
            <li>2. แสดงหน้านี้ให้พนักงานดู</li>
            <li>3. พนักงานกดยืนยันสะสมแต้ม (+1 แก้ว)</li>
            <li>
              4. ครบ {STAMPS_PER_FREE} แก้ว แลกฟรี 1 แก้ว (ให้พนักงานกดแลก)
            </li>
          </ol>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            รหัสสมาชิก (ให้พนักงานค้นหา)
          </p>
          <p className="mt-2 font-mono text-lg font-bold text-slate-900">
            {data.member.id}
          </p>
          <p className="mt-1 text-sm text-slate-500">{data.member.email}</p>
        </section>

        {ready && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <span className="material-symbols-outlined text-[22px] text-emerald-600">
              celebration
            </span>
            <div>
              <p className="font-semibold text-emerald-900">พร้อมแลกฟรี 1 แก้ว!</p>
              <p className="mt-0.5 text-sm text-emerald-800">
                แจ้งพนักงานที่เคาน์เตอร์เพื่อแลกกาแฟฟรี
              </p>
            </div>
          </div>
        )}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">ประวัติล่าสุด</h2>
            <p className="text-xs text-slate-500">
              แลกฟรีแล้ว {data.loyalty.freeRedeemed} ครั้ง
            </p>
          </div>
          {data.events.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              ยังไม่มีประวัติสะสมแต้ม
            </p>
          ) : (
            <ul className="space-y-2">
              {data.events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {eventTypeLabel(event.eventType)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(event.createdAt.slice(0, 10))}
                      {event.staffName ? ` · ${event.staffName}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-amber-800">
                    {event.stampsAfter}/{STAMPS_PER_FREE}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
