"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CoffeeStampCard } from "@/components/CoffeeStampCard";
import { Badge } from "@/components/Badge";
import {
  CoffeeLoyalty,
  CoffeeLoyaltyEvent,
  CoffeeMemberSummary,
  CoffeeSalesReport,
  CoffeeStampRequest,
  STAMPS_PER_FREE,
  canRedeemFree,
  displayStamps,
  eventTypeLabel,
  requestTypeLabel,
} from "@/lib/coffee-loyalty";
import { formatDate, statusColors } from "@/lib/store";
import { todayISO } from "@/lib/dates";

const statusLabels: Record<string, string> = {
  active: "ใช้งาน",
  pending: "รอดำเนินการ",
  expired: "หมดอายุ",
};

function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function CoffeeCounterPage() {
  const [pending, setPending] = useState<CoffeeStampRequest[]>([]);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<CoffeeMemberSummary[]>([]);
  const [selected, setSelected] = useState<CoffeeMemberSummary | null>(null);
  const [events, setEvents] = useState<CoffeeLoyaltyEvent[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reportFrom, setReportFrom] = useState(daysAgoISO(13));
  const [reportTo, setReportTo] = useState(todayISO());
  const [report, setReport] = useState<CoffeeSalesReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await fetch("/api/coffee?pending=1", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "โหลดคำขอไม่สำเร็จ");
        return;
      }
      setPending(data.requests ?? []);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const loadReport = useCallback(async (from = reportFrom, to = reportTo) => {
    setLoadingReport(true);
    try {
      const res = await fetch(
        `/api/coffee?report=1&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "โหลดรายงานไม่สำเร็จ");
        return;
      }
      setReport(data);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoadingReport(false);
    }
  }, [reportFrom, reportTo]);

  const searchMembers = useCallback(async (q: string) => {
    if (!q.trim()) {
      setMembers([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await fetch(`/api/coffee?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ค้นหาไม่สำเร็จ");
        return;
      }
      setMembers(data.members ?? []);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  const loadMemberDetail = useCallback(async (memberId: string) => {
    const res = await fetch(`/api/coffee?memberId=${encodeURIComponent(memberId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
    return data as { loyalty: CoffeeLoyalty; events: CoffeeLoyaltyEvent[] };
  }, []);

  const selectMember = useCallback(
    async (member: CoffeeMemberSummary) => {
      setSelected(member);
      setMessage("");
      setError("");
      try {
        const detail = await loadMemberDetail(member.id);
        setSelected({ ...member, loyalty: detail.loyalty });
        setEvents(detail.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      }
    },
    [loadMemberDetail]
  );

  useEffect(() => {
    loadPending();
    const timer = setInterval(loadPending, 8000);
    return () => clearInterval(timer);
  }, [loadPending]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    const timer = setTimeout(() => searchMembers(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchMembers]);

  const handleConfirm = async (requestId: string) => {
    setActingId(requestId);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/coffee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", requestId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ยืนยันไม่สำเร็จ");
        return;
      }
      setMessage(
        data.request?.requestType === "redeem"
          ? `ยืนยันแลกฟรีให้ ${data.request.memberName} แล้ว`
          : data.readyToRedeem
            ? `ยืนยันสะสมแต้มให้ ${data.request.memberName} แล้ว — ครบ ${STAMPS_PER_FREE} แก้ว!`
            : `ยืนยันสะสมแต้มให้ ${data.request.memberName} แล้ว`
      );
      await loadPending();
      await loadReport();
      if (selected && data.request?.memberId === selected.id) {
        setSelected({ ...selected, loyalty: data.loyalty });
        setEvents((prev) => [data.event, ...prev].slice(0, 12));
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActingId(requestId);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/coffee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", requestId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ปฏิเสธไม่สำเร็จ");
        return;
      }
      setMessage(`ปฏิเสธคำขอของ ${data.request.memberName} แล้ว`);
      await loadPending();
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setActingId(null);
    }
  };

  const handleManual = async (action: "stamp" | "redeem") => {
    if (!selected) return;
    setActing(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/coffee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selected.id, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "บันทึกไม่สำเร็จ");
        return;
      }
      setSelected({ ...selected, loyalty: data.loyalty });
      setEvents((prev) => [data.event, ...prev].slice(0, 12));
      setMessage(
        action === "redeem"
          ? "แลกฟรี 1 แก้วสำเร็จ"
          : data.readyToRedeem
            ? `สะสมแต้มแล้ว — ครบ ${STAMPS_PER_FREE} แก้ว!`
            : "บันทึกสะสมแต้ม +1 แก้วแล้ว"
      );
      await loadReport();
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setActing(false);
    }
  };

  const todayRow = report?.days.find((d) => d.date === todayISO());

  return (
    <div>
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        rel="stylesheet"
      />

      <PageHeader
        titleTh="Liftlab Coffee"
        titleEn="Coffee Loyalty Counter"
        descriptionTh={`สมาชิกกดขอสะสมใน Portal → พนักงานกดยืนยันที่นี่ (ครบ ${STAMPS_PER_FREE} แก้ว ฟรี 1 แก้ว)`}
        descriptionEn="Confirm member stamp requests from the portal"
        icon="coffee"
      />

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pending queue — primary workflow */}
      <section className="card mb-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-amber-700">inbox</span>
            <h2 className="text-sm font-semibold text-slate-900">คำขอที่รอยืนยัน</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {pending.length}
            </span>
          </div>
          <button
            onClick={loadPending}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            รีเฟรช
          </button>
        </div>

        {loadingPending ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          </div>
        ) : pending.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            ยังไม่มีคำขอจากสมาชิก — เมื่อลูกค้ากดขอสะสมใน Portal จะโผล่ที่นี่
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.map((req) => (
              <li
                key={req.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-orange-500 text-sm font-bold text-white">
                    {req.memberName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{req.memberName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {req.memberPhone} · {req.memberEmail}
                    </p>
                    <p className="mt-1 text-xs font-medium text-amber-800">
                      {requestTypeLabel(req.requestType)} · แต้มปัจจุบัน{" "}
                      {displayStamps(req.stampsSnapshot)}/{STAMPS_PER_FREE}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleConfirm(req.id)}
                    disabled={actingId === req.id}
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60 sm:flex-none"
                  >
                    ยืนยัน
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={actingId === req.id}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 sm:flex-none"
                  >
                    ปฏิเสธ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Daily sales report */}
      <section className="card mb-6 overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-amber-700">analytics</span>
              <h2 className="text-sm font-semibold text-slate-900">รายงานการซื้อกาแฟ</h2>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-slate-500">
                จาก
                <input
                  type="date"
                  value={reportFrom}
                  onChange={(e) => setReportFrom(e.target.value)}
                  className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-slate-500">
                ถึง
                <input
                  type="date"
                  value={reportTo}
                  onChange={(e) => setReportTo(e.target.value)}
                  className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              <button
                onClick={() => loadReport(reportFrom, reportTo)}
                className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800"
              >
                ดูรายงาน
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            นับจำนวนแก้วจากการยืนยันสะสมแต้ม และแก้วแลกฟรี
          </p>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-medium text-amber-800/70">วันนี้ · ขาย</p>
            <p className="mt-1 text-2xl font-bold text-amber-950">
              {todayRow?.cupsSold ?? 0}
            </p>
            <p className="text-xs text-amber-800/80">แก้ว</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-medium text-emerald-800/70">ช่วงที่เลือก · แลกฟรี</p>
            <p className="mt-1 text-2xl font-bold text-emerald-950">
              {report?.totals.freeCups ?? 0}
            </p>
            <p className="text-xs text-emerald-800/80">แก้ว</p>
          </div>
        </div>

        {loadingReport ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          </div>
        ) : !report || report.days.length === 0 ? (
          <p className="px-4 pb-8 text-center text-sm text-slate-500">
            ยังไม่มีข้อมูลในช่วงนี้ — เมื่อยืนยันสะสมแต้มจะบันทึกอัตโนมัติ
          </p>
        ) : (
          <div className="overflow-x-auto px-2 pb-4">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2 font-semibold">วันที่</th>
                  <th className="px-3 py-2 font-semibold">แก้วที่ขาย</th>
                  <th className="px-3 py-2 font-semibold">แลกฟรี</th>
                  <th className="px-3 py-2 font-semibold text-right">รวม</th>
                </tr>
              </thead>
              <tbody>
                {report.days.map((day) => (
                  <tr key={day.date} className="border-b border-slate-50 hover:bg-amber-50/40">
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      {formatDate(day.date)}
                      {day.date === todayISO() && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          วันนี้
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{day.cupsSold} แก้ว</td>
                    <td className="px-3 py-2.5 text-slate-700">{day.freeCups} แก้ว</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-900">
                      {day.cupsSold + day.freeCups} แก้ว
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td className="px-3 py-2.5">รวม</td>
                  <td className="px-3 py-2.5">{report.totals.cupsSold} แก้ว</td>
                  <td className="px-3 py-2.5">{report.totals.freeCups} แก้ว</td>
                  <td className="px-3 py-2.5 text-right text-amber-900">
                    {report.totals.cupsSold + report.totals.freeCups} แก้ว
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Manual fallback */}
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        สำรอง — ค้นหาสมาชิกแล้วกดเอง (ถ้าลูกค้ากดขอไม่ได้)
      </p>
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-4 lg:col-span-2">
          <div className="card p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">ค้นหาสมาชิก</label>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                search
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ชื่อ, อีเมล, เบอร์โทร..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none ring-brand-500 focus:border-brand-400 focus:ring-2"
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            {loadingSearch ? (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
              </div>
            ) : members.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                {query.trim() ? "ไม่พบสมาชิก" : "พิมพ์ชื่อหรือเบอร์เพื่อค้นหา"}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {members.map((member) => (
                  <li key={member.id}>
                    <button
                      onClick={() => selectMember(member)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-amber-50/70 ${
                        selected?.id === member.id ? "bg-amber-50" : ""
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-orange-500 text-sm font-bold text-white">
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{member.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {member.phone} · {member.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-amber-800">
                          {displayStamps(member.loyalty.stamps)}/{STAMPS_PER_FREE}
                        </p>
                        <Badge
                          label={statusLabels[member.status] ?? member.status}
                          className={statusColors[member.status] ?? "bg-slate-100 text-slate-600"}
                        />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-4 lg:col-span-3">
          {!selected ? (
            <div className="card flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-sm text-slate-500">เลือกสมาชิกถ้าต้องการกดแต้มเอง</p>
            </div>
          ) : (
            <>
              <CoffeeStampCard stamps={selected.loyalty.stamps} memberName={selected.name} />
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => handleManual("stamp")}
                  disabled={acting}
                  className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  สะสมแต้ม (+1)
                </button>
                <button
                  onClick={() => handleManual("redeem")}
                  disabled={acting || !canRedeemFree(selected.loyalty.stamps)}
                  className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 disabled:opacity-50"
                >
                  แลกฟรี 1 แก้ว
                </button>
              </div>
              <div className="card p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">ประวัติล่าสุด</h3>
                {events.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">ยังไม่มีประวัติ</p>
                ) : (
                  <ul className="space-y-2">
                    {events.map((event) => (
                      <li
                        key={event.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
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
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
