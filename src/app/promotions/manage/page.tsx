"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { useData } from "@/lib/data-context";
import { formatCurrency, formatDate, generateId } from "@/lib/store";
import { Promotion, PromotionDiscountType } from "@/lib/types";
import {
  applyDiscount,
  discountBadge,
  discountTypeLabels,
  isLive,
  todayISO,
} from "@/lib/promotions";
import { can } from "@/lib/permissions";

type Filter = "all" | "live" | "scheduled" | "ended";

const emptyForm = {
  title: "",
  description: "",
  discountType: "percent" as PromotionDiscountType,
  discountValue: 10,
  packageId: "",
  code: "",
  startDate: todayISO(),
  endDate: todayISO(),
  status: "active" as "active" | "inactive",
  highlight: false,
};

function phaseOf(promo: Promotion, today: string): Filter {
  if (promo.status === "inactive" || promo.endDate < today) return "ended";
  if (promo.startDate > today) return "scheduled";
  return "live";
}

const phaseLabels: Record<Exclude<Filter, "all">, string> = {
  live: "กำลังใช้งาน",
  scheduled: "รอเริ่ม",
  ended: "จบแล้ว",
};

const phaseColors: Record<Exclude<Filter, "all">, string> = {
  live: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-blue-100 text-blue-700",
  ended: "bg-gray-100 text-gray-600",
};

export default function ManagePromotionsPage() {
  const { data, updateData, hydrated } = useData();
  const [role, setRole] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setRole(json?.user?.role ?? ""))
      .catch(() => setRole(""));
  }, []);

  const canEdit = can(role, "promotions.edit");
  const today = todayISO();
  const promotions = data.promotions ?? [];

  const visible = promotions.filter((promo) => {
    if (filter !== "all" && phaseOf(promo, today) !== filter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      promo.title.toLowerCase().includes(q) ||
      promo.description.toLowerCase().includes(q) ||
      (promo.code ?? "").toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (promo: Promotion) => {
    setEditingId(promo.id);
    setForm({
      title: promo.title,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      packageId: promo.packageId ?? "",
      code: promo.code ?? "",
      startDate: promo.startDate,
      endDate: promo.endDate,
      status: promo.status,
      highlight: promo.highlight,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: form.discountType === "gift" ? 0 : Number(form.discountValue),
      packageId: form.packageId || null,
      code: form.code.trim() ? form.code.trim().toUpperCase() : null,
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
      highlight: form.highlight,
    };

    if (editingId) {
      updateData((prev) => ({
        ...prev,
        promotions: (prev.promotions ?? []).map((p) =>
          p.id === editingId ? { ...p, ...payload } : p
        ),
      }));
    } else {
      const created: Promotion = { id: generateId("pr"), ...payload };
      updateData((prev) => ({
        ...prev,
        promotions: [...(prev.promotions ?? []), created],
      }));
    }

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = (id: string) => {
    if (!confirm("ลบโปรโมชั่นนี้ออกจากระบบ?")) return;
    updateData((prev) => ({
      ...prev,
      promotions: (prev.promotions ?? []).filter((p) => p.id !== id),
    }));
  };

  const toggleStatus = (promo: Promotion) => {
    updateData((prev) => ({
      ...prev,
      promotions: (prev.promotions ?? []).map((p) =>
        p.id === promo.id
          ? { ...p, status: p.status === "active" ? "inactive" : "active" }
          : p
      ),
    }));
  };

  const packageName = (id: string | null) =>
    id ? (data.packages.find((p) => p.id === id)?.name ?? "—") : "ทุกแพ็กเกจ";

  const liveCount = promotions.filter((p) => isLive(p, today)).length;

  const previewPackage = form.packageId
    ? data.packages.find((p) => p.id === form.packageId)
    : null;

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        titleTh="โปรโมชั่น"
        titleEn="Promotions"
        descriptionTh={`กำลังแสดงให้ลูกค้าเห็น ${liveCount} โปร`}
        descriptionEn="โปรที่เปิดใช้งานและอยู่ในช่วงวันที่จะขึ้นหน้าลูกค้าทันที"
        action={
          canEdit ? (
            <button onClick={openCreate} className="btn-primary">
              <span className="material-symbols-outlined text-[18px]">add</span>
              เพิ่มโปรโมชั่น
            </button>
          ) : undefined
        }
      />

      <div className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="material-symbols-outlined text-[20px] text-brand-600">
            public
          </span>
          <span>
            ลูกค้าดูได้ที่{" "}
            <Link
              href="/promotions"
              target="_blank"
              className="font-medium text-brand-600 underline underline-offset-2"
            >
              /promotions
            </Link>{" "}
            โดยไม่ต้องเข้าสู่ระบบ
          </span>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
            search
          </span>
          <input
            className="input-field pl-10"
            placeholder="ค้นหาชื่อโปรหรือโค้ด"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "live", "scheduled", "ended"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                filter === f
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "ทั้งหมด" : phaseLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card px-5 py-16 text-center">
          <span className="material-symbols-outlined text-[40px] text-slate-300">
            sell
          </span>
          <p className="mt-2 text-sm text-slate-500">
            {promotions.length === 0
              ? "ยังไม่มีโปรโมชั่นในระบบ กดปุ่มเพิ่มโปรโมชั่นเพื่อเริ่มต้น"
              : "ไม่พบโปรโมชั่นที่ตรงกับเงื่อนไข"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((promo) => {
            const phase = phaseOf(promo, today);

            return (
              <div key={promo.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-bold text-slate-900">
                        {promo.title}
                      </h3>
                      {promo.highlight && (
                        <span
                          className="material-symbols-outlined text-[16px] text-amber-500"
                          title="ปักหมุด"
                        >
                          push_pin
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDate(promo.startDate)} – {formatDate(promo.endDate)}
                    </p>
                  </div>
                  <Badge
                    label={phaseLabels[phase as Exclude<Filter, "all">]}
                    className={phaseColors[phase as Exclude<Filter, "all">]}
                  />
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                  {promo.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-lg bg-rose-50 px-2 py-1 font-semibold text-rose-600">
                    {discountBadge(promo)}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">
                    {packageName(promo.packageId)}
                  </span>
                  {promo.code && (
                    <span className="rounded-lg border border-dashed border-slate-300 px-2 py-1 font-mono text-slate-600">
                      {promo.code}
                    </span>
                  )}
                </div>

                {canEdit && (
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => openEdit(promo)}
                      className="btn-secondary flex-1 py-1.5 text-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        edit
                      </span>
                      แก้ไข
                    </button>
                    <button
                      onClick={() => toggleStatus(promo)}
                      className="btn-secondary py-1.5 text-sm"
                      title={
                        promo.status === "active" ? "ปิดใช้งาน" : "เปิดใช้งาน"
                      }
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {promo.status === "active"
                          ? "visibility_off"
                          : "visibility"}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "แก้ไขโปรโมชั่น" : "เพิ่มโปรโมชั่น"}
        subtitle="ข้อมูลนี้จะแสดงให้ลูกค้าเห็นในหน้าโปรโมชั่น"
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">ชื่อโปรโมชั่น</label>
            <input
              className="input-field"
              placeholder="เช่น สมัครใหม่เดือนนี้ ลด 20%"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label-field">รายละเอียด</label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="อธิบายเงื่อนไขให้ลูกค้าเข้าใจง่าย"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field">รูปแบบส่วนลด</label>
              <select
                className="input-field"
                value={form.discountType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discountType: e.target.value as PromotionDiscountType,
                  })
                }
              >
                {Object.entries(discountTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-field">
                {form.discountType === "percent"
                  ? "ลดกี่เปอร์เซ็นต์"
                  : form.discountType === "amount"
                    ? "ลดกี่บาท"
                    : "ไม่ต้องกรอกสำหรับของแถม"}
              </label>
              <input
                type="number"
                className="input-field"
                min={0}
                max={form.discountType === "percent" ? 100 : undefined}
                value={form.discountValue}
                onChange={(e) =>
                  setForm({ ...form, discountValue: Number(e.target.value) })
                }
                disabled={form.discountType === "gift"}
                required={form.discountType !== "gift"}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field">ใช้กับแพ็กเกจ</label>
              <select
                className="input-field"
                value={form.packageId}
                onChange={(e) => setForm({ ...form, packageId: e.target.value })}
              >
                <option value="">ทุกแพ็กเกจ</option>
                {data.packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} — {formatCurrency(pkg.price)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-field">โค้ดส่วนลด (ถ้ามี)</label>
              <input
                className="input-field font-mono uppercase"
                placeholder="NEW20"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field">เริ่มวันที่</label>
              <input
                type="date"
                className="input-field"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label-field">สิ้นสุดวันที่</label>
              <input
                type="date"
                className="input-field"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          {form.endDate < form.startDate && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              วันสิ้นสุดต้องไม่มาก่อนวันเริ่ม
            </p>
          )}

          {previewPackage && form.discountType !== "gift" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">ลูกค้าจะเห็นราคา </span>
              <span className="text-slate-400 line-through">
                {formatCurrency(previewPackage.price)}
              </span>{" "}
              <span className="font-bold text-rose-600">
                {formatCurrency(
                  applyDiscount(
                    previewPackage.price,
                    form.discountType,
                    Number(form.discountValue)
                  )
                )}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={form.status === "active"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.checked ? "active" : "inactive",
                  })
                }
              />
              เปิดใช้งาน
            </label>
            <label className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={form.highlight}
                onChange={(e) =>
                  setForm({ ...form, highlight: e.target.checked })
                }
              />
              ปักหมุดขึ้นก่อน
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary flex-1"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 disabled:opacity-60"
              disabled={form.endDate < form.startDate}
            >
              {editingId ? "บันทึกการแก้ไข" : "เพิ่มโปรโมชั่น"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
