"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CoffeeStampCard } from "@/components/CoffeeStampCard";
import { BrandLogo } from "@/components/BrandLogo";
import {
  CoffeeLoyalty,
  CoffeeLoyaltyEvent,
  CoffeeStampRequest,
  STAMPS_PER_FREE,
  canRedeemFree,
  eventTypeLabel,
  requestStatusLabel,
  requestTypeLabel,
} from "@/lib/coffee-loyalty";
import { formatDate } from "@/lib/store";

interface PortalCoffeeData {
  member: { id: string; name: string; email: string };
  loyalty: CoffeeLoyalty;
  events: CoffeeLoyaltyEvent[];
  pendingRequest: CoffeeStampRequest | null;
  requests: CoffeeStampRequest[];
}

export default function PortalCoffeePage() {
  const [data, setData] = useState<PortalCoffeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  const submitRequest = async (requestType: "stamp" | "redeem") => {
    setActing(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/portal/coffee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ส่งคำขอไม่สำเร็จ");
        return;
      }
      setMessage(
        requestType === "redeem"
          ? "ส่งคำขอแลกฟรีแล้ว — รอพนักงานยืนยันที่เคาน์เตอร์"
          : "ส่งคำขอสะสมแต้มแล้ว — รอพนักงานยืนยันที่เคาน์เตอร์"
      );
      await load();
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setActing(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  if ((error && !data) || !data) {
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
  const hasPending = Boolean(data.pendingRequest);

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
          <button
            onClick={load}
            className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
            title="รีเฟรช"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 sm:py-8">
        <CoffeeStampCard
          stamps={data.loyalty.stamps}
          memberName={data.member.name}
        />

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {hasPending ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4">
            <span className="material-symbols-outlined text-[22px] text-amber-700">hourglass_top</span>
            <div>
              <p className="font-semibold text-amber-950">
                {requestTypeLabel(data.pendingRequest!.requestType)} — รอพนักงานยืนยัน
              </p>
              <p className="mt-0.5 text-sm text-amber-800">
                แสดงหน้านี้ให้พนักงานที่เคาน์เตอร์ แล้วรอสักครู่
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            <button
              onClick={() => submitRequest("stamp")}
              disabled={acting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-4 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[22px]">add_circle</span>
              กดขอสะสมแต้ม (+1 แก้ว)
            </button>
            <button
              onClick={() => submitRequest("redeem")}
              disabled={acting || !ready}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[22px]">redeem</span>
              กดขอแลกฟรี 1 แก้ว
            </button>
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">วิธีใช้งาน</p>
          <ol className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
            <li>1. สั่งกาแฟที่เคาน์เตอร์ Liftlab Coffee</li>
            <li>2. กดปุ่ม <strong>ขอสะสมแต้ม</strong> ในหน้านี้</li>
            <li>3. พนักงานกดยืนยันคำขอ → ได้ +1 แก้ว</li>
            <li>4. ครบ {STAMPS_PER_FREE} แก้ว กดขอแลกฟรี แล้วให้พนักงานยืนยัน</li>
          </ol>
        </section>

        {ready && !hasPending && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <span className="material-symbols-outlined text-[22px] text-emerald-600">
              celebration
            </span>
            <div>
              <p className="font-semibold text-emerald-900">พร้อมแลกฟรี 1 แก้ว!</p>
              <p className="mt-0.5 text-sm text-emerald-800">
                กดปุ่มขอแลกฟรีด้านบน แล้วแจ้งพนักงานยืนยัน
              </p>
            </div>
          </div>
        )}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">คำขอล่าสุด</h2>
            <p className="text-xs text-slate-500">
              แลกฟรีแล้ว {data.loyalty.freeRedeemed} ครั้ง
            </p>
          </div>
          {data.requests.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              ยังไม่มีคำขอสะสมแต้ม
            </p>
          ) : (
            <ul className="space-y-2">
              {data.requests.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {requestTypeLabel(req.requestType)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(req.createdAt.slice(0, 10))}
                      {req.staffName ? ` · ${req.staffName}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      req.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : req.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {requestStatusLabel(req.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">ประวัติแต้มที่ยืนยันแล้ว</h2>
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
