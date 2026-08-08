"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { useData } from "@/lib/data-context";
import {
  generateId,
  formatDate,
  statusColors,
  bookingTypeLabels,
} from "@/lib/store";
import { Booking, BookingType } from "@/lib/types";

const tabs: { key: BookingType | "all"; labelTh: string; labelEn: string }[] = [
  { key: "all", labelTh: "ทั้งหมด", labelEn: "All" },
  { key: "class", labelTh: "คลาส", labelEn: "Class" },
  { key: "trainer", labelTh: "เทรนเนอร์ (PT)", labelEn: "Trainer" },
  { key: "facility", labelTh: "พื้นที่", labelEn: "Facility" },
];

const emptyForm = {
  type: "class" as BookingType,
  memberId: "",
  resourceId: "",
  date: "",
  time: "",
  notes: "",
};

export default function BookingsPage() {
  const { data, updateData, hydrated } = useData();
  const [tab, setTab] = useState<BookingType | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filtered =
    tab === "all"
      ? data.bookings
      : data.bookings.filter((b) => b.type === tab);

  const getResources = (type: BookingType) => {
    switch (type) {
      case "class":
        return data.classes
          .filter((c) => c.status === "active")
          .map((c) => ({ id: c.id, name: c.name }));
      case "trainer":
        return data.staff
          .filter((s) => s.role === "trainer" && s.status === "active")
          .map((s) => ({ id: s.id, name: `${s.name} (PT)` }));
      case "facility":
        return data.facilities
          .filter((f) => f.status === "available")
          .map((f) => ({ id: f.id, name: f.name }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resources = getResources(form.type);
    const resource = resources.find((r) => r.id === form.resourceId);
    if (!resource) return;

    const booking: Booking = {
      id: generateId("b"),
      type: form.type,
      memberId: form.memberId,
      resourceId: form.resourceId,
      resourceName: resource.name,
      date: form.date,
      time: form.time,
      status: "confirmed",
      notes: form.notes || undefined,
    };

    updateData((prev) => ({
      ...prev,
      bookings: [booking, ...prev.bookings],
    }));

    setForm(emptyForm);
    setModalOpen(false);
  };

  const cancelBooking = (id: string) => {
    updateData((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) =>
        b.id === id ? { ...b, status: "cancelled" as const } : b
      ),
    }));
  };

  if (!hydrated) return null;

  return (
    <div>
      <PageHeader
        titleTh="ระบบจองคลาส เทรนเนอร์ และพื้นที่"
        titleEn="Booking System"
        descriptionTh="จองคลาสกลุ่ม Personal Training และพื้นที่ใช้งาน"
        descriptionEn="Book classes, personal training, and facility spaces"
        action={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            สร้างการจอง
          </button>
        }
      />

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
            {t.labelTh}
            <span className="ml-1 text-xs opacity-70">{t.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Booking cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((booking) => {
          const member = data.members.find((m) => m.id === booking.memberId);
          const icon =
            booking.type === "class"
              ? "fitness_center"
              : booking.type === "trainer"
                ? "person"
                : "meeting_room";

          return (
            <div key={booking.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <span className="material-symbols-outlined text-[20px]">
                      {icon}
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

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="material-symbols-outlined text-[16px]">
                    person
                  </span>
                  {member?.name ?? "—"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="material-symbols-outlined text-[16px]">
                    calendar_today
                  </span>
                  {formatDate(booking.date)} · {booking.time}
                </div>
                {booking.notes && (
                  <p className="text-xs text-slate-400">{booking.notes}</p>
                )}
              </div>

              {booking.status === "confirmed" && (
                <button
                  onClick={() => cancelBooking(booking.id)}
                  className="btn-danger mt-4 w-full"
                >
                  ยกเลิกการจอง
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card flex flex-col items-center py-16 text-center">
          <span className="material-symbols-outlined text-[48px] text-slate-300">
            event_busy
          </span>
          <p className="mt-3 text-sm font-medium text-slate-600">
            ยังไม่มีการจอง
          </p>
          <p className="text-xs text-slate-400">No bookings yet</p>
        </div>
      )}

      {/* Create booking modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="สร้างการจองใหม่"
        subtitle="Create New Booking"
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">ประเภทการจอง / Type</label>
            <select
              className="input-field"
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as BookingType,
                  resourceId: "",
                })
              }
            >
              <option value="class">คลาส / Class</option>
              <option value="trainer">เทรนเนอร์ (PT) / Trainer</option>
              <option value="facility">พื้นที่ / Facility</option>
            </select>
          </div>

          <div>
            <label className="label-field">สมาชิก / Member</label>
            <select
              className="input-field"
              value={form.memberId}
              onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              required
            >
              <option value="">เลือกสมาชิก</option>
              {data.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-field">
              {form.type === "class"
                ? "คลาส"
                : form.type === "trainer"
                  ? "เทรนเนอร์"
                  : "พื้นที่"}{" "}
              / Resource
            </label>
            <select
              className="input-field"
              value={form.resourceId}
              onChange={(e) =>
                setForm({ ...form, resourceId: e.target.value })
              }
              required
            >
              <option value="">เลือก</option>
              {getResources(form.type).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">วันที่ / Date</label>
              <input
                type="date"
                className="input-field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label-field">เวลา / Time</label>
              <input
                type="time"
                className="input-field"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="label-field">หมายเหตุ / Notes</label>
            <textarea
              className="input-field min-h-[80px] resize-none"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              ยืนยันการจอง
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
