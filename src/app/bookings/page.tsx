"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { useData } from "@/lib/data-context";
import {
  bookingTypeMeta,
  BOOKING_HORIZON_DAYS,
  classSlotAvailability,
  dateCardMonth,
  dayNumber,
  groupDatesByMonth,
  isSlotInPast,
  isTrainerSlotTaken,
  slotsForType,
  upcomingDates,
  weekdayLabel,
} from "@/lib/bookings";
import {
  generateId,
  formatDate,
  statusColors,
  bookingTypeLabels,
  formatCurrency,
} from "@/lib/store";
import { Booking, BookingType } from "@/lib/types";
import { hasSessionQuota } from "@/lib/sessions";
import { todayISO } from "@/lib/dates";

type WizardStep = "type" | "resource" | "datetime" | "member" | "confirm";
type StatusFilter = "all" | "confirmed" | "completed" | "cancelled";

const typeTabs: { key: BookingType | "all"; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "class", label: "คลาส" },
  { key: "trainer", label: "PT" },
  { key: "facility", label: "พื้นที่" },
];

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "ทุกสถานะ" },
  { key: "confirmed", label: "ยืนยันแล้ว" },
  { key: "completed", label: "เสร็จสิ้น" },
  { key: "cancelled", label: "ยกเลิก" },
];

const statusLabel: Record<Booking["status"], string> = {
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิก",
  completed: "เสร็จสิ้น",
};

function dateHeading(date: string, today: string): string {
  if (date === today) return "วันนี้";
  const tomorrow = new Date(today + "T12:00:00");
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date === tomorrow.toISOString().slice(0, 10)) return "พรุ่งนี้";
  return formatDate(date);
}

export default function BookingsPage() {
  const { data, updateData, hydrated } = useData();
  const [tab, setTab] = useState<BookingType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("confirmed");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("type");
  const [bookingType, setBookingType] = useState<BookingType>("class");
  const [resourceId, setResourceId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [memberId, setMemberId] = useState("");
  const [notes, setNotes] = useState("");

  const dates = useMemo(() => upcomingDates(BOOKING_HORIZON_DAYS), []);
  const dateGroups = useMemo(() => groupDatesByMonth(dates), [dates]);
  const today = todayISO();

  const stats = useMemo(() => {
    const todayBookings = data.bookings.filter(
      (b) => b.date === today && b.status === "confirmed"
    );
    return {
      today: todayBookings.length,
      class: todayBookings.filter((b) => b.type === "class").length,
      trainer: todayBookings.filter((b) => b.type === "trainer").length,
      facility: todayBookings.filter((b) => b.type === "facility").length,
    };
  }, [data.bookings, today]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.bookings.filter((b) => {
      if (tab !== "all" && b.type !== tab) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q) return true;
      const member = data.members.find((m) => m.id === b.memberId);
      return (
        b.resourceName.toLowerCase().includes(q) ||
        (member?.name ?? "").toLowerCase().includes(q) ||
        b.time.includes(q) ||
        b.date.includes(q)
      );
    });
  }, [data.bookings, data.members, tab, statusFilter, query]);

  const grouped = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
    const map = new Map<string, Booking[]>();
    for (const booking of sorted) {
      const list = map.get(booking.date) ?? [];
      list.push(booking);
      map.set(booking.date, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const activeClasses = data.classes.filter((c) => c.status === "active");
  const activeTrainers = data.staff.filter(
    (s) => s.role === "trainer" && s.status === "active"
  );
  const activeFacilities = data.facilities.filter((f) => f.status === "available");

  const selectedClass = activeClasses.find((c) => c.id === resourceId);
  const selectedTrainer = activeTrainers.find((t) => t.id === resourceId);
  const selectedFacility = activeFacilities.find((f) => f.id === resourceId);

  const timeSlots = useMemo(() => {
    if (bookingType === "class" && selectedClass) {
      return slotsForType("class", selectedClass);
    }
    return slotsForType(bookingType);
  }, [bookingType, selectedClass]);

  const resetWizard = () => {
    setStep("type");
    setBookingType("class");
    setResourceId("");
    setSelectedDate("");
    setSelectedTime("");
    setMemberId("");
    setNotes("");
  };

  const openWizard = (type?: BookingType) => {
    resetWizard();
    if (type) {
      setBookingType(type);
      setStep("resource");
    }
    setModalOpen(true);
  };

  const getResourceName = (): string => {
    if (bookingType === "class") return selectedClass?.name ?? "";
    if (bookingType === "trainer")
      return selectedTrainer ? `${selectedTrainer.name} (PT)` : "";
    return selectedFacility?.name ?? "";
  };

  const slotStatus = (time: string) => {
    if (!resourceId || !selectedDate) return { available: true, label: "" };

    if (isSlotInPast(selectedDate, time)) {
      return { available: false, label: "ผ่านมาแล้ว" };
    }

    if (bookingType === "trainer") {
      const taken = isTrainerSlotTaken(data.bookings, resourceId, selectedDate, time);
      return { available: !taken, label: taken ? "ไม่ว่าง" : "ว่าง" };
    }
    if (bookingType === "class" && selectedClass) {
      const { remaining, full } = classSlotAvailability(
        data.bookings,
        resourceId,
        selectedDate,
        time,
        selectedClass.capacity
      );
      return {
        available: !full,
        label: full ? "เต็ม" : `เหลือ ${remaining}`,
      };
    }
    return { available: true, label: "ว่าง" };
  };

  const handleConfirm = () => {
    const resourceName = getResourceName();
    if (!resourceName || !memberId || !selectedDate || !selectedTime) return;
    if (isSlotInPast(selectedDate, selectedTime)) return;

    const booking: Booking = {
      id: generateId("b"),
      type: bookingType,
      memberId,
      resourceId,
      resourceName,
      date: selectedDate,
      time: selectedTime,
      status: "confirmed",
      notes: notes || undefined,
    };

    updateData((prev) => ({
      ...prev,
      bookings: [booking, ...prev.bookings],
    }));

    setModalOpen(false);
    resetWizard();
    setStatusFilter("confirmed");
  };

  const cancelBooking = (id: string) => {
    updateData((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) =>
        b.id === id ? { ...b, status: "cancelled" as const } : b
      ),
    }));
  };

  const completeBooking = (id: string) => {
    updateData((prev) => {
      const booking = prev.bookings.find((b) => b.id === id);
      if (!booking || booking.status === "completed") {
        return {
          ...prev,
          bookings: prev.bookings.map((b) =>
            b.id === id ? { ...b, status: "completed" as const } : b
          ),
        };
      }

      let members = prev.members;
      if (booking.type === "trainer") {
        members = prev.members.map((m) => {
          if (m.id !== booking.memberId) return m;
          if (!hasSessionQuota(m.sessionsTotal)) return m;
          const used = m.sessionsUsed ?? 0;
          if (used >= (m.sessionsTotal as number)) return m;
          return { ...m, sessionsUsed: used + 1 };
        });
      }

      return {
        ...prev,
        members,
        bookings: prev.bookings.map((b) =>
          b.id === id ? { ...b, status: "completed" as const } : b
        ),
      };
    });
  };

  const canProceedFromResource = !!resourceId;
  const canProceedFromDatetime = !!selectedDate && !!selectedTime;
  const canProceedFromMember = !!memberId;

  if (!hydrated) return null;

  return (
    <div>
      <PageHeader
        icon="calendar_month"
        titleTh="การจอง"
        titleEn="Bookings"
        descriptionTh="ดูตารางจองตามวัน และสร้างการจองคลาส PT หรือพื้นที่"
        action={
          <button className="btn-primary" onClick={() => openWizard()}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            สร้างการจอง
          </button>
        }
      />

      {/* Compact today strip */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-sm shadow-slate-200/40">
        <div className="flex items-center gap-2 text-slate-700">
          <span className="material-symbols-outlined text-[18px] text-brand-600">
            today
          </span>
          <span className="font-medium">วันนี้</span>
          <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-sm font-bold text-brand-700">
            {stats.today}
          </span>
        </div>
        <div className="hidden h-4 w-px bg-slate-200 sm:block" />
        <div className="flex flex-wrap gap-4 text-slate-500">
          <span>
            คลาส <strong className="font-semibold text-slate-800">{stats.class}</strong>
          </span>
          <span>
            PT <strong className="font-semibold text-slate-800">{stats.trainer}</strong>
          </span>
          <span>
            พื้นที่{" "}
            <strong className="font-semibold text-slate-800">{stats.facility}</strong>
          </span>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {(
            [
              { type: "class" as const, label: "จองคลาส", icon: "fitness_center" },
              { type: "trainer" as const, label: "จอง PT", icon: "person" },
              { type: "facility" as const, label: "จองพื้นที่", icon: "meeting_room" },
            ] as const
          ).map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => openWizard(item.type)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
            >
              <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
            search
          </span>
          <input
            className="input-field pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อสมาชิก คลาส เทรนเนอร์ หรือเวลา"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {typeTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  tab === t.key
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statusTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatusFilter(t.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === t.key
                    ? "bg-brand-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule list */}
      {grouped.length > 0 ? (
        <div className="space-y-5">
          {grouped.map(([date, items]) => (
            <section key={date} className="card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-baseline gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {dateHeading(date, today)}
                  </h2>
                  {dateHeading(date, today) !== formatDate(date) && (
                    <span className="truncate text-sm text-slate-500">
                      {formatDate(date)}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {items.length} รายการ
                </span>
              </div>

              <ul className="divide-y divide-slate-100">
                {items.map((booking) => {
                  const member = data.members.find((m) => m.id === booking.memberId);
                  const meta = bookingTypeMeta(booking.type);

                  return (
                    <li
                      key={booking.id}
                      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                    >
                      <div className="flex min-w-[4.5rem] items-center gap-3 sm:block sm:text-center">
                        <p className="text-xl font-bold tabular-nums tracking-tight text-slate-900">
                          {booking.time}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium sm:mt-1 ${meta.bg} ${meta.text}`}
                        >
                          <span className="material-symbols-outlined text-[12px]">
                            {meta.icon}
                          </span>
                          {bookingTypeLabels[booking.type].th}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">
                          {booking.resourceName}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-slate-500">
                          {member?.name ?? "—"}
                          {booking.notes ? ` · ${booking.notes}` : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Badge
                          label={statusLabel[booking.status]}
                          className={statusColors[booking.status]}
                        />
                        {booking.status === "confirmed" && (
                          <>
                            <button
                              type="button"
                              onClick={() => completeBooking(booking.id)}
                              className="btn-secondary px-3 py-1.5 text-xs"
                            >
                              เสร็จสิ้น
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelBooking(booking.id)}
                              className="btn-danger px-3 py-1.5 text-xs"
                            >
                              ยกเลิก
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center py-16 text-center">
          <span className="material-symbols-outlined text-[48px] text-slate-300">
            event_busy
          </span>
          <p className="mt-3 text-sm font-medium text-slate-600">
            {query || tab !== "all" || statusFilter !== "all"
              ? "ไม่พบการจองตามเงื่อนไข"
              : "ยังไม่มีการจอง"}
          </p>
          <button className="btn-primary mt-4" onClick={() => openWizard()}>
            สร้างการจอง
          </button>
        </div>
      )}

      {/* Booking wizard modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="สร้างการจองใหม่"
        subtitle={
          step === "type"
            ? "เลือกประเภท"
            : step === "resource"
              ? "เลือกรายการ"
              : step === "datetime"
                ? "เลือกวันและเวลา"
                : step === "member"
                  ? "เลือกสมาชิก"
                  : "ยืนยันการจอง"
        }
        wide
      >
        <div className="mb-6 flex items-center gap-1">
          {(["type", "resource", "datetime", "member", "confirm"] as WizardStep[]).map(
            (s, i) => (
              <div key={s} className="flex flex-1 items-center gap-1">
                <div
                  className={`h-1.5 flex-1 rounded-full transition ${
                    (
                      ["type", "resource", "datetime", "member", "confirm"].indexOf(
                        step
                      ) >= i
                    )
                      ? "bg-brand-500"
                      : "bg-slate-200"
                  }`}
                />
              </div>
            )
          )}
        </div>

        {step === "type" && (
          <div className="grid gap-3 sm:grid-cols-3">
            {(["class", "trainer", "facility"] as BookingType[]).map((type) => {
              const meta = bookingTypeMeta(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setBookingType(type);
                    setResourceId("");
                    setStep("resource");
                  }}
                  className={`rounded-2xl border-2 p-5 text-left transition hover:shadow-md ${
                    bookingType === type
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-white`}
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      {meta.icon}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900">{meta.label}</p>
                  <p className="text-xs text-slate-500">{meta.labelEn}</p>
                </button>
              );
            })}
          </div>
        )}

        {step === "resource" && (
          <div className="space-y-3">
            {bookingType === "class" &&
              activeClasses.map((c) => {
                const trainer = data.staff.find((s) => s.id === c.trainerId);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setResourceId(c.id)}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                      resourceId === c.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-200 hover:border-brand-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {trainer?.name} · {c.duration} นาที · รับ {c.capacity} คน
                        </p>
                        <p className="mt-1 text-xs text-brand-700">{c.schedule}</p>
                      </div>
                      <span className="shrink-0 font-bold text-brand-700">
                        {formatCurrency(c.price)}
                      </span>
                    </div>
                  </button>
                );
              })}

            {bookingType === "trainer" &&
              activeTrainers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setResourceId(t.id)}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${
                    resourceId === t.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 hover:border-brand-200"
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-emerald-500 text-lg font-bold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">Personal Trainer · {t.phone}</p>
                  </div>
                </button>
              ))}

            {bookingType === "facility" &&
              activeFacilities.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setResourceId(f.id)}
                  className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                    resourceId === f.id
                      ? "border-sky-500 bg-sky-50"
                      : "border-slate-200 hover:border-sky-200"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{f.name}</p>
                  <p className="text-xs text-slate-500">
                    {f.type} · ความจุ {f.capacity} คน
                  </p>
                </button>
              ))}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep("type")}
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={!canProceedFromResource}
                onClick={() => setStep("datetime")}
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}

        {step === "datetime" && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-end justify-between gap-3">
                <p className="label-field mb-0">เลือกวันที่</p>
                {selectedDate && (
                  <p className="text-xs font-medium text-brand-700">
                    {formatDate(selectedDate)}
                  </p>
                )}
              </div>
              <div className="space-y-4">
                {dateGroups.map((group) => (
                  <div key={group.monthKey}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {group.label}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {group.dates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setSelectedDate(d);
                            setSelectedTime("");
                          }}
                          className={`flex min-w-[4.75rem] shrink-0 flex-col items-center rounded-xl border-2 px-3 py-2 transition ${
                            selectedDate === d
                              ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                              : "border-slate-200 hover:border-brand-200"
                          }`}
                        >
                          <span className="text-[10px] uppercase text-slate-500">
                            {weekdayLabel(d)}
                          </span>
                          <span className="text-lg font-bold leading-tight">
                            {dayNumber(d)}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            {dateCardMonth(d)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <p className="label-field mb-0">เลือกเวลา</p>
                  <p className="text-xs text-slate-500">{formatDate(selectedDate)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {timeSlots.map((time) => {
                    const status = slotStatus(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={!status.available}
                        onClick={() => setSelectedTime(time)}
                        className={`rounded-xl border-2 px-2 py-2.5 text-sm transition ${
                          selectedTime === time
                            ? "border-brand-500 bg-brand-50 font-semibold text-brand-700"
                            : status.available
                              ? "border-slate-200 hover:border-brand-200"
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

            <div className="flex gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep("resource")}
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={!canProceedFromDatetime}
                onClick={() => setStep("member")}
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}

        {step === "member" && (
          <div className="space-y-4">
            <div>
              <label className="label-field">สมาชิก</label>
              <select
                className="input-field"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">เลือกสมาชิก</option>
                {data.members
                  .filter((m) => m.status === "active")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label-field">หมายเหตุ (ถ้ามี)</label>
              <textarea
                className="input-field min-h-[80px] resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น ต้องการโฟกัส upper body"
              />
            </div>
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
                disabled={!canProceedFromMember}
                onClick={() => setStep("confirm")}
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">ประเภท</span>
                  <span className="font-medium text-right">
                    {bookingTypeLabels[bookingType].th}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">รายการ</span>
                  <span className="font-medium text-right">{getResourceName()}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">วันที่</span>
                  <span className="font-medium text-right">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">เวลา</span>
                  <span className="font-medium text-right">{selectedTime}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">สมาชิก</span>
                  <span className="font-medium text-right">
                    {data.members.find((m) => m.id === memberId)?.name}
                  </span>
                </div>
                {notes && (
                  <div className="border-t border-slate-200 pt-3">
                    <span className="text-slate-500">หมายเหตุ: </span>
                    {notes}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep("member")}
              >
                ย้อนกลับ
              </button>
              <button type="button" className="btn-primary flex-1" onClick={handleConfirm}>
                ยืนยันการจอง
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
