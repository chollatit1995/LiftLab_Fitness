"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bookingTypeMeta,
  classSlotAvailability,
  classTimeSlots,
  dayNumber,
  isTrainerSlotTaken,
  TRAINER_TIME_SLOTS,
  upcomingDates,
  weekdayLabel,
} from "@/lib/bookings";
import { formatCurrency, formatDate } from "@/lib/store";
import {
  BookingCatalog,
  BookingCatalogClass,
  BookingCatalogTrainer,
} from "@/lib/db/bookings";

type BookTab = "class" | "trainer";
type Step = "pick" | "datetime" | "confirm";

export default function PortalBookPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<BookingCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<BookTab>("class");
  const [step, setStep] = useState<Step>("pick");
  const [selectedClass, setSelectedClass] = useState<BookingCatalogClass | null>(
    null
  );
  const [selectedTrainer, setSelectedTrainer] =
    useState<BookingCatalogTrainer | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dates = useMemo(() => upcomingDates(14), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/bookings");
      if (res.ok) {
        setCatalog(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "trainer" || t === "class") setTab(t);
  }, []);

  const bookings = useMemo(
    () =>
      (catalog?.confirmedSlots ?? []).map((s) => ({
        resourceId: s.resourceId,
        date: s.date,
        time: s.time,
        status: "confirmed" as const,
        memberId: s.memberId,
      })),
    [catalog]
  );

  const timeSlots = useMemo(() => {
    if (tab === "trainer") return TRAINER_TIME_SLOTS;
    if (selectedClass) return classTimeSlots(selectedClass);
    return TRAINER_TIME_SLOTS;
  }, [tab, selectedClass]);

  const resourceId =
    tab === "class" ? selectedClass?.id : selectedTrainer?.id;

  const slotStatus = (time: string) => {
    if (!resourceId || !selectedDate) return { available: true, label: "" };

    if (tab === "trainer") {
      const taken = isTrainerSlotTaken(bookings, resourceId, selectedDate, time);
      return { available: !taken, label: taken ? "ไม่ว่าง" : "ว่าง" };
    }
    if (selectedClass) {
      const { remaining, full } = classSlotAvailability(
        bookings,
        resourceId,
        selectedDate,
        time,
        selectedClass.capacity
      );
      return { available: !full, label: full ? "เต็ม" : `เหลือ ${remaining}` };
    }
    return { available: true, label: "" };
  };

  const resetSelection = () => {
    setSelectedClass(null);
    setSelectedTrainer(null);
    setSelectedDate("");
    setSelectedTime("");
    setNotes("");
    setStep("pick");
    setError("");
    setSuccess("");
  };

  const handleTabChange = (next: BookTab) => {
    setTab(next);
    resetSelection();
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const resourceName =
        tab === "class"
          ? selectedClass!.name
          : `${selectedTrainer!.name} (PT)`;

      const res = await fetch("/api/portal/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tab,
          resourceId,
          resourceName,
          date: selectedDate,
          time: selectedTime,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "จองไม่สำเร็จ");
        return;
      }
      setSuccess("จองสำเร็จแล้ว!");
      await load();
      setTimeout(() => router.push("/portal"), 1500);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const classMeta = bookingTypeMeta("class");
  const trainerMeta = bookingTypeMeta("trainer");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/25 to-slate-100">
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        rel="stylesheet"
      />

      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/portal" className="flex items-center gap-2 text-slate-600 hover:text-brand-700">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            <span className="text-sm font-medium">กลับ Portal</span>
          </Link>
          <p className="font-bold text-slate-900">จองคลาส & เทรนเนอร์</p>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Tab switcher */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {(
            [
              { key: "class" as BookTab, meta: classMeta },
              { key: "trainer" as BookTab, meta: trainerMeta },
            ] as const
          ).map(({ key, meta }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                tab === key
                  ? "border-brand-500 bg-white shadow-md"
                  : "border-transparent bg-white/60 hover:bg-white"
              }`}
            >
              <div
                className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-white`}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {meta.icon}
                </span>
              </div>
              <p className="font-semibold text-slate-900">{meta.label}</p>
              <p className="text-xs text-slate-500">{meta.labelEn}</p>
            </button>
          ))}
        </div>

        {/* Step: Pick resource */}
        {step === "pick" && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">
              {tab === "class" ? "เลือกคลาส" : "เลือกเทรนเนอร์"}
            </h2>

            {tab === "class" &&
              (catalog?.classes.length ?? 0) === 0 && (
                <p className="text-sm text-slate-500">ยังไม่มีคลาสให้จอง</p>
              )}

            {tab === "class" &&
              catalog?.classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedClass(c);
                    setStep("datetime");
                  }}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{c.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{c.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                          {c.trainerName}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                          {c.duration} นาที
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                          รับ {c.capacity} คน
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-violet-600">{c.schedule}</p>
                    </div>
                    <span className="shrink-0 text-lg font-bold text-violet-700">
                      {formatCurrency(c.price)}
                    </span>
                  </div>
                </button>
              ))}

            {tab === "trainer" &&
              catalog?.trainers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTrainer(t);
                    setStep("datetime");
                  }}
                  className="flex w-full items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-emerald-500 text-xl font-bold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">Personal Trainer</p>
                    <p className="mt-1 text-xs text-brand-600">{t.phone}</p>
                  </div>
                </button>
              ))}
          </section>
        )}

        {/* Step: Date & Time */}
        {step === "datetime" && (
          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs text-slate-500">กำลังจอง</p>
              <p className="font-bold text-slate-900">
                {tab === "class" ? selectedClass?.name : selectedTrainer?.name}
              </p>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-700">เลือกวันที่</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {dates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d);
                      setSelectedTime("");
                    }}
                    className={`flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-xl border-2 px-3 py-2.5 transition ${
                      selectedDate === d
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white hover:border-brand-200"
                    }`}
                  >
                    <span className="text-[10px] uppercase">{weekdayLabel(d)}</span>
                    <span className="text-lg font-bold">{dayNumber(d)}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">เลือกเวลา</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {timeSlots.map((time) => {
                    const status = slotStatus(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={!status.available}
                        onClick={() => setSelectedTime(time)}
                        className={`rounded-xl border-2 px-2 py-3 text-sm transition ${
                          selectedTime === time
                            ? "border-brand-500 bg-brand-50 font-semibold text-brand-700"
                            : status.available
                              ? "border-slate-200 bg-white hover:border-brand-200"
                              : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                        }`}
                      >
                        <span className="block font-medium">{time}</span>
                        {status.label && (
                          <span className="block text-[10px] opacity-70">
                            {status.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="label-field">หมายเหตุ (ถ้ามี)</label>
              <textarea
                className="input-field min-h-[72px] resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น ต้องการโฟกัส cardio"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button type="button" className="btn-secondary" onClick={resetSelection}>
                ย้อนกลับ
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={!selectedDate || !selectedTime}
                onClick={() => setStep("confirm")}
              >
                ถัดไป
              </button>
            </div>
          </section>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <section className="space-y-5">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <div
                className={`bg-gradient-to-r ${tab === "class" ? classMeta.gradient : trainerMeta.gradient} px-5 py-4 text-white`}
              >
                <p className="text-xs uppercase tracking-wider text-white/70">
                  ยืนยันการจอง
                </p>
                <p className="mt-1 text-xl font-bold">
                  {tab === "class" ? selectedClass?.name : selectedTrainer?.name}
                </p>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">ประเภท</span>
                  <span className="font-medium">
                    {tab === "class" ? "คลาส" : "เทรนเนอร์ (PT)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">วันที่</span>
                  <span className="font-medium">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">เวลา</span>
                  <span className="font-medium">{selectedTime} น.</span>
                </div>
                {tab === "class" && selectedClass && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">ราคา</span>
                    <span className="font-medium">
                      {formatCurrency(selectedClass.price)}
                    </span>
                  </div>
                )}
                {notes && (
                  <div className="border-t border-slate-100 pt-3 text-slate-600">
                    {notes}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep("datetime")}
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? "กำลังจอง..." : "ยืนยันการจอง"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
