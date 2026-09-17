"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import {
  COFFEE_HISTORY_LIMIT,
  CoffeeHistoryResult,
  STAMPS_PER_FREE,
  displayStamps,
  eventTypeLabel,
} from "@/lib/coffee-loyalty";
import { formatDateTime } from "@/lib/store";
import { todayISO } from "@/lib/dates";

function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const RANGE_PRESETS = [
  { label: "วันนี้", days: 0 },
  { label: "7 วัน", days: 6 },
  { label: "30 วัน", days: 29 },
] as const;

export default function CoffeeHistoryPage() {
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState<CoffeeHistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (nextFrom: string, nextTo: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/coffee/history?from=${encodeURIComponent(nextFrom)}&to=${encodeURIComponent(nextTo)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "โหลดประวัติไม่สำเร็จ");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(daysAgoISO(29), todayISO());
  }, [load]);

  const applyPreset = (days: number) => {
    const nextFrom = daysAgoISO(days);
    const nextTo = todayISO();
    setFrom(nextFrom);
    setTo(nextTo);
    load(nextFrom, nextTo);
  };

  const truncated = data ? data.total > data.entries.length : false;

  return (
    <div>
      <PageHeader
        titleTh="ประวัติกาแฟ"
        titleEn="Coffee History"
        descriptionTh="ทุกครั้งที่มีการกดสะสมแต้มและแลกแก้วฟรี พร้อมชื่อพนักงานที่กด"
        descriptionEn="Every stamp and redemption, with the staff member who recorded it"
        icon="history"
        action={
          <Link
            href="/coffee"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-[18px]">coffee</span>
            กลับหน้าเคาน์เตอร์
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ตัวกรองช่วงวันที่ */}
      <section className="card mb-6 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-500">
              จาก
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-slate-500">
              ถึง
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              onClick={() => load(from, to)}
              className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800"
            >
              ดูประวัติ
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset.days)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* สรุปยอดในช่วงที่เลือก */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{data?.total ?? 0}</p>
          <p className="text-xs font-medium text-slate-600">รายการทั้งหมด</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{data?.totals.stamps ?? 0}</p>
          <p className="text-xs font-medium text-slate-600">สะสมแต้ม</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {data?.totals.redeems ?? 0}
          </p>
          <p className="text-xs font-medium text-slate-600">แลกฟรี</p>
        </div>
      </div>

      {/* ใครกดบ้าง */}
      <section className="card mb-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <span className="material-symbols-outlined text-[20px] text-amber-700">
            badge
          </span>
          <h2 className="text-sm font-semibold text-slate-900">สรุปตามพนักงาน</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          </div>
        ) : !data || data.byStaff.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            ไม่มีรายการในช่วงนี้
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">พนักงาน</th>
                  <th className="px-4 py-2.5 text-right font-semibold">สะสมแต้ม</th>
                  <th className="px-4 py-2.5 text-right font-semibold">แลกฟรี</th>
                  <th className="px-4 py-2.5 text-right font-semibold">รวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.byStaff.map((row) => (
                  <tr key={row.staffName} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {row.staffName}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {row.stamps}
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">
                      {row.redeems}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {row.stamps + row.redeems}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* รายการทีละบรรทัด */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-amber-700">
              receipt_long
            </span>
            <h2 className="text-sm font-semibold text-slate-900">รายการทั้งหมด</h2>
          </div>
          {truncated && (
            <p className="text-xs font-medium text-amber-700">
              แสดง {data?.entries.length} รายการล่าสุด จากทั้งหมด {data?.total} รายการ
              — ลดช่วงวันที่ลงเพื่อดูให้ครบ
            </p>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          </div>
        ) : !data || data.entries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            ไม่มีรายการในช่วงนี้
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">เวลา</th>
                  <th className="px-4 py-2.5 text-left font-semibold">สมาชิก</th>
                  <th className="px-4 py-2.5 text-left font-semibold">รายการ</th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    แต้มหลังทำรายการ
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold">พนักงานที่กด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {entry.memberName}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                          entry.eventType === "redeem"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {eventTypeLabel(entry.eventType)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {displayStamps(entry.stampsAfter)}/{STAMPS_PER_FREE}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {entry.staffName || "ไม่ระบุ"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          ดึงได้สูงสุด {COFFEE_HISTORY_LIMIT} รายการต่อการค้นหา ·
          การปฏิเสธคำขอยังไม่ถูกบันทึกในประวัตินี้
        </p>
      </section>
    </div>
  );
}
