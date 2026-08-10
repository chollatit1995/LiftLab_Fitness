"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { useData } from "@/lib/data-context";
import {
  bookingTypeMeta,
  classSlotAvailability,
  dayNumber,
  isTrainerSlotTaken,
  memberAlreadyBooked,
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

const tabs: { key: BookingType | "all"; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "class", label: "คลาส" },
  { key: "trainer", label: "เทรนเนอร์" },
  { key: "facility", label: "พื้นที่" },
];

export default function BookingsPage() {
  const { data, updateData, hydrated } = useData();
  const [tab, setTab] = useState<BookingType | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("type");
  const [bookingType, setBookingType] = useState<BookingType>("class");
  const [resourceId, setResourceId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [memberId, setMemberId] = useState("");
  const [notes, setNotes] = useState("");

  const dates = useMemo(() => upcomingDates(14), []);
  const today = todayISO();

  const stats = useMemo(() => {
    const todayBookings = data.bookings.filter(
      (b) => b.date === today && b.status === "confirmed"
    );
    return {
      today: todayBookings.length,
      class: todayBookings.filter((b) => b.type === "class").length,
      trainer: todayBookings.filter((b) => b.type === "trainer").length,
    };
  }, [data.bookings, today]);

  const filtered =
    tab === "all" ? data.bookings : data.bookings.filter((b) => b.type === tab);

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

  const openWizard = () => {
    resetWizard();
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
        titleTh="ระบบจองคลาส & เทรนเนอร์"
        titleEn="Class & Trainer Booking"
        descriptionTh="จองคลาสกลุ่ม Personal Training และพื้นที่ใช้งาน"
        descriptionEn="Book group classes, PT sessions, and facilities"
        action={
          <button className="btn-primary" onClick={openWizard}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            สร้างการจอง
          </button>
        }
      />

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: "today",
            label: "จองวันนี้",
            value: stats.today,
            gradient: "from-brand-600 to-emerald-500",
          },
          {
            icon: "fitness_center",
            label: "คลาสวันนี้",
            value: stats.class,
            gradient: "from-violet-500 to-purple-600",
          },
          {
            icon: "person",
            label: "PT วันนี้",
            value: stats.trainer,
            gradient: "from-sky-500 to-blue-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card flex items-center gap-4 overflow-hidden p-5"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-md`}
            >
              <span className="material-symbols-outlined text-[24px]">
                {stat.icon}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick book cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => {
            resetWizard();
            setBookingType("class");
            setStep("resource");
            setModalOpen(true);
          }}
          className="group card overflow-hidden p-0 text-left transition hover:shadow-lg"
        >
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 px-6 py-5 text-white">
            <span className="material-symbols-outlined text-[32px] opacity-90">
              fitness_center
            </span>
            <p className="mt-2 text-lg font-bold">จองคลาสกลุ่ม</p>
            <p className="text-sm text-white/80">
              {activeClasses.length} คลาสพร้อมจอง
            </p>
          </div>
          <div className="px-6 py-3 text-sm font-medium text-violet-700 group-hover:text-violet-800">
            เลือกคลาส → วัน → เวลา →
          </div>
        </button>

        <button
          onClick={() => {
            resetWizard();
            setBookingType("trainer");
            setStep("resource");
            setModalOpen(true);
          }}
          className="group card overflow-hidden p-0 text-left transition hover:shadow-lg"
        >
          <div className="bg-gradient-to-br from-brand-600 to-emerald-500 px-6 py-5 text-white">
            <span className="material-symbols-outlined text-[32px] opacity-90">
              person
            </span>
            <p className="mt-2 text-lg font-bold">จองเทรนเนอร์ (PT)</p>
            <p className="text-sm text-white/80">
              {activeTrainers.length} เทรนเนอร์พร้อมให้บริการ
            </p>
          </div>
          <div className="px-6 py-3 text-sm font-medium text-brand-700 group-hover:text-brand-800">
            เลือกเทรนเนอร์ → วัน → เวลา →
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/25"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Booking list */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((booking) => {
          const member = data.members.find((m) => m.id === booking.memberId);
          const meta = bookingTypeMeta(booking.type);

          return (
            <div key={booking.id} className="card overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${meta.gradient}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.bg} ${meta.text}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {meta.icon}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {booking.resourceName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {bookingTypeLabels[booking.type].th}
                      </p>
                    </div>
                  </div>
                  <Badge
                    label={
                      booking.status === "confirmed"
                        ? "ยืนยันแล้ว"
                        : booking.status === "cancelled"
                          ? "ยกเลิก"
                          : "เสร็จสิ้น"
                    }
                    className={statusColors[booking.status]}
                  />
                </div>

                <div className="mt-4 space-y-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">
                      person
                    </span>
                    {member?.name ?? "—"}
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">
                      calendar_today
                    </span>
                    {formatDate(booking.date)} · {booking.time}
                  </div>
                  {booking.notes && (
                    <p className="text-xs text-slate-500">{booking.notes}</p>
                  )}
                </div>

                {booking.status === "confirmed" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => completeBooking(booking.id)}
                      className="btn-secondary flex-1 text-xs"
                    >
                      เสร็จสิ้น
                    </button>
                    <button
                      onClick={() => cancelBooking(booking.id)}
                      className="btn-danger flex-1 text-xs"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card flex flex-col items-center py-16 text-center">
          <span className="material-symbols-outlined text-[48px] text-slate-300">
            event_busy
          </span>
          <p className="mt-3 text-sm font-medium text-slate-600">ยังไม่มีการจอง</p>
          <button className="btn-primary mt-4" onClick={openWizard}>
            สร้างการจองแรก
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
        {/* Step indicator */}
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

        {/* Step: Type */}
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

        {/* Step: Resource */}
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
                        ? "border-violet-500 bg-violet-50"
                        : "border-slate-200 hover:border-violet-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {trainer?.name} · {c.duration} นาที · รับ {c.capacity} คน
                        </p>
                        <p className="mt-1 text-xs text-violet-600">{c.schedule}</p>
                      </div>
                      <span className="font-bold text-violet-700">
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

        {/* Step: Date & Time */}
        {step === "datetime" && (
          <div className="space-y-5">
            <div>
              <p className="label-field mb-2">เลือกวันที่</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {dates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d);
                      setSelectedTime("");
                    }}
                    className={`flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-xl border-2 px-3 py-2 transition ${
                      selectedDate === d
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 hover:border-brand-200"
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
                <p className="label-field mb-2">เลือกเวลา</p>
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

        {/* Step: Member */}
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

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">ประเภท</span>
                  <span className="font-medium">
                    {bookingTypeLabels[bookingType].th}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">รายการ</span>
                  <span className="font-medium">{getResourceName()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">วันที่</span>
                  <span className="font-medium">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">เวลา</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สมาชิก</span>
                  <span className="font-medium">
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
