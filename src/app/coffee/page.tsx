"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CoffeeStampCard } from "@/components/CoffeeStampCard";
import { Badge } from "@/components/Badge";
import {
  CoffeeLoyalty,
  CoffeeLoyaltyEvent,
  CoffeeMemberSummary,
  STAMPS_PER_FREE,
  canRedeemFree,
  displayStamps,
  eventTypeLabel,
} from "@/lib/coffee-loyalty";
import { formatDate, statusColors } from "@/lib/store";

const statusLabels: Record<string, string> = {
  active: "ใช้งาน",
  pending: "รอดำเนินการ",
  expired: "หมดอายุ",
};

export default function CoffeeCounterPage() {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<CoffeeMemberSummary[]>([]);
  const [selected, setSelected] = useState<CoffeeMemberSummary | null>(null);
  const [events, setEvents] = useState<CoffeeLoyaltyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const searchMembers = useCallback(async (q: string) => {
    if (!q.trim()) {
      setMembers([]);
      return;
    }
    setLoading(true);
    setError("");
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
      setLoading(false);
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
        setSelected({
          ...member,
          loyalty: detail.loyalty,
        });
        setEvents(detail.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      }
    },
    [loadMemberDetail]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      searchMembers(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchMembers]);

  const readyToRedeem = useMemo(
    () => (selected ? canRedeemFree(selected.loyalty.stamps) : false),
    [selected]
  );

  const handleStamp = async () => {
    if (!selected) return;
    setActing(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/coffee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selected.id, action: "stamp" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "บันทึกแต้มไม่สำเร็จ");
        return;
      }
      setSelected({ ...selected, loyalty: data.loyalty });
      setEvents((prev) => [data.event, ...prev].slice(0, 12));
      setMessage(
        data.readyToRedeem
          ? `สะสมแต้มแล้ว — ครบ ${STAMPS_PER_FREE} แก้ว! กดแลกฟรีได้เลย`
          : "บันทึกสะสมแต้ม +1 แก้วแล้ว"
      );
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setActing(false);
    }
  };

  const handleRedeem = async () => {
    if (!selected) return;
    setActing(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/coffee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selected.id, action: "redeem" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "แลกฟรีไม่สำเร็จ");
        return;
      }
      setSelected({ ...selected, loyalty: data.loyalty });
      setEvents((prev) => [data.event, ...prev].slice(0, 12));
      setMessage("แลกฟรี 1 แก้วสำเร็จ — เริ่มสะสมรอบใหม่");
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setActing(false);
    }
  };

  return (
    <div>
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        rel="stylesheet"
      />

      <PageHeader
        titleTh="Liftlab Coffee"
        titleEn="Coffee Loyalty Counter"
        descriptionTh={`สะสมครบ ${STAMPS_PER_FREE} แก้ว ฟรี 1 แก้ว — ค้นหาสมาชิกแล้วกดยืนยันแต้ม`}
        descriptionEn="Search member and confirm stamp or free redemption"
        icon="coffee"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-4 lg:col-span-2">
          <div className="card p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              ค้นหาสมาชิก
            </label>
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
            <p className="mt-2 text-xs text-slate-500">
              ให้ลูกค้าเปิดหน้า Liftlab Coffee ใน Member Portal แล้วค้นหาชื่อหรืออีเมล
            </p>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
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
                        <p className="truncate font-medium text-slate-900">
                          {member.name}
                        </p>
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
            <div className="card flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <span className="material-symbols-outlined text-[32px]">coffee</span>
              </div>
              <p className="text-lg font-semibold text-slate-800">เลือกสมาชิกจากรายการ</p>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                ค้นหาแล้วเลือกสมาชิกเพื่อบันทึกสะสมแต้มหรือแลกกาแฟฟรี
              </p>
            </div>
          ) : (
            <>
              {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {message}
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <CoffeeStampCard
                stamps={selected.loyalty.stamps}
                memberName={selected.name}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={handleStamp}
                  disabled={acting}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-4 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  ยืนยันสะสมแต้ม (+1 แก้ว)
                </button>
                <button
                  onClick={handleRedeem}
                  disabled={acting || !readyToRedeem}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">redeem</span>
                  แลกฟรี 1 แก้ว
                </button>
              </div>

              <div className="card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">ประวัติล่าสุด</h3>
                  <p className="text-xs text-slate-500">
                    สะสมทั้งหมด {selected.loyalty.totalStamps} แก้ว · แลกฟรี{" "}
                    {selected.loyalty.freeRedeemed} ครั้ง
                  </p>
                </div>
                {events.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">ยังไม่มีประวัติ</p>
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
