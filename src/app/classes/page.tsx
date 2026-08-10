"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { useData } from "@/lib/data-context";
import { generateId, formatCurrency, statusColors } from "@/lib/store";
import { FitnessClass, MembershipPackage } from "@/lib/types";
import { hasSessionQuota } from "@/lib/sessions";

type Tab = "classes" | "packages";

const emptyClassForm = {
  name: "",
  description: "",
  trainerId: "",
  capacity: 20,
  duration: 60,
  schedule: "",
  price: 0,
  status: "active" as "active" | "inactive",
};

const emptyPackageForm = {
  name: "",
  description: "",
  price: 0,
  durationDays: 30,
  sessionLimit: "" as number | "",
  features: "",
  status: "active" as "active" | "inactive",
  popular: false,
};

const packageIcons: Record<string, string> = {
  Mini: "storefront",
  Starter: "store",
  Growth: "apartment",
  Accelerate: "corporate_fare",
};

export default function ClassesPage() {
  const { data, updateData, hydrated } = useData();
  const [tab, setTab] = useState<Tab>("classes");
  const [modalMode, setModalMode] = useState<"class" | "package" | null>(null);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [packageForm, setPackageForm] = useState(emptyPackageForm);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  const trainers = data.staff.filter(
    (s) => s.role === "trainer" && s.status === "active"
  );

  const openClassCreate = () => {
    setEditingClassId(null);
    setClassForm(emptyClassForm);
    setTab("classes");
    setModalMode("class");
  };

  const openPackageCreate = () => {
    setEditingPackageId(null);
    setPackageForm(emptyPackageForm);
    setTab("packages");
    setModalMode("package");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingClassId(null);
    setEditingPackageId(null);
  };

  const handleClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClassId) {
      updateData((prev) => ({
        ...prev,
        classes: prev.classes.map((c) =>
          c.id === editingClassId ? { ...c, ...classForm } : c
        ),
      }));
    } else {
      const newClass: FitnessClass = {
        id: generateId("c"),
        ...classForm,
      };
      updateData((prev) => ({
        ...prev,
        classes: [...prev.classes, newClass],
      }));
    }
    closeModal();
    setClassForm(emptyClassForm);
  };

  const handlePackageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sessionLimit =
      packageForm.sessionLimit === "" || packageForm.sessionLimit === 0
        ? null
        : Number(packageForm.sessionLimit);
    const pkgData = {
      name: packageForm.name,
      description: packageForm.description,
      price: packageForm.price,
      durationDays: packageForm.durationDays,
      sessionLimit,
      features: packageForm.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      status: packageForm.status,
      popular: packageForm.popular,
    };

    if (editingPackageId) {
      updateData((prev) => ({
        ...prev,
        packages: prev.packages.map((p) =>
          p.id === editingPackageId ? { ...p, ...pkgData } : p
        ),
      }));
    } else {
      const newPkg: MembershipPackage = {
        id: generateId("p"),
        ...pkgData,
      };
      updateData((prev) => ({
        ...prev,
        packages: [...prev.packages, newPkg],
      }));
    }
    closeModal();
    setPackageForm(emptyPackageForm);
  };

  const deleteClass = (id: string) => {
    if (!confirm("ต้องการลบคลาสนี้?")) return;
    updateData((prev) => ({
      ...prev,
      classes: prev.classes.filter((c) => c.id !== id),
    }));
  };

  const deletePackage = (id: string) => {
    if (!confirm("ต้องการลบแพ็กเกจนี้?")) return;
    updateData((prev) => ({
      ...prev,
      packages: prev.packages.filter((p) => p.id !== id),
    }));
  };

  if (!hydrated) return null;

  return (
    <div>
      <PageHeader
        titleTh="จัดการคลาสและแพ็กเกจสมาชิก"
        titleEn="Classes & Membership Packages"
        descriptionTh="จัดการคลาสออกกำลังกายและแพ็กเกจสมาชิกของ LiftLab Fitness"
        descriptionEn="Manage fitness classes and membership packages"
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={openClassCreate}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              เพิ่มคลาส
            </button>
            <button className="btn-primary" onClick={openPackageCreate}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              เพิ่มแพ็กเกจ
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab("classes")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            tab === "classes"
              ? "bg-brand-600 text-white shadow-md shadow-brand-600/25"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          คลาส / Classes
        </button>
        <button
          onClick={() => setTab("packages")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            tab === "packages"
              ? "bg-brand-600 text-white shadow-md shadow-brand-600/25"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          แพ็กเกจสมาชิก / Packages
        </button>
      </div>

      {tab === "classes" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.classes.map((cls) => {
            const trainer = data.staff.find((s) => s.id === cls.trainerId);
            return (
              <div key={cls.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <span className="material-symbols-outlined text-[22px]">
                        fitness_center
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{cls.name}</h3>
                      <p className="text-xs text-slate-500">{cls.description}</p>
                    </div>
                  </div>
                  <Badge
                    label={cls.status === "active" ? "เปิดสอน" : "ปิด"}
                    className={statusColors[cls.status]}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">เทรนเนอร์</p>
                    <p className="font-medium text-slate-700">
                      {trainer?.name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">ที่นั่ง</p>
                    <p className="font-medium text-slate-700">{cls.capacity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">ระยะเวลา</p>
                    <p className="font-medium text-slate-700">
                      {cls.duration} นาที
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">ราคา</p>
                    <p className="font-medium text-brand-600">
                      {formatCurrency(cls.price)}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  📅 {cls.schedule}
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setEditingClassId(cls.id);
                      setClassForm({
                        name: cls.name,
                        description: cls.description,
                        trainerId: cls.trainerId,
                        capacity: cls.capacity,
                        duration: cls.duration,
                        schedule: cls.schedule,
                        price: cls.price,
                        status: cls.status,
                      });
                      setModalMode("class");
                    }}
                    className="btn-secondary flex-1 text-xs"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => deleteClass(cls.id)}
                    className="btn-danger text-xs"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "packages" && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`card relative flex flex-col p-6 ${
                pkg.popular
                  ? "ring-2 ring-brand-500 shadow-lg shadow-brand-500/10"
                  : ""
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    <span className="material-symbols-outlined text-[14px]">
                      local_fire_department
                    </span>
                    ยอดนิยม
                  </span>
                </div>
              )}

              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <span className="material-symbols-outlined text-[24px]">
                  {packageIcons[pkg.name] ?? "inventory_2"}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{pkg.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{pkg.description}</p>

              <div className="my-4">
                <span className="text-3xl font-bold text-slate-900">
                  {formatCurrency(pkg.price)}
                </span>
                <span className="text-sm text-slate-500"> / เดือน</span>
                <p className="mt-1 text-xs text-slate-400">
                  {pkg.durationDays} วัน
                  {hasSessionQuota(pkg.sessionLimit)
                    ? ` · ${pkg.sessionLimit} ครั้ง`
                    : ""}{" "}
                  · ~฿
                  {Math.round(pkg.price / (pkg.durationDays / 30))}/เดือน
                </p>
              </div>

              <ul className="mb-4 flex-1 space-y-2">
                {pkg.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-slate-600"
                  >
                    <span className="material-symbols-outlined mt-0.5 text-[14px] text-brand-500">
                      check
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Badge
                label={pkg.status === "active" ? "เปิดใช้งาน" : "ปิด"}
                className={`mb-3 self-start ${statusColors[pkg.status]}`}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingPackageId(pkg.id);
                    setPackageForm({
                      name: pkg.name,
                      description: pkg.description,
                      price: pkg.price,
                      durationDays: pkg.durationDays,
                      sessionLimit: pkg.sessionLimit ?? "",
                      features: pkg.features.join("\n"),
                      status: pkg.status,
                      popular: pkg.popular ?? false,
                    });
                    setModalMode("package");
                  }}
                  className="btn-secondary flex-1 text-xs"
                >
                  แก้ไข
                </button>
                <button
                  onClick={() => deletePackage(pkg.id)}
                  className="btn-danger text-xs"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Class modal */}
      <Modal
        open={modalMode === "class"}
        onClose={closeModal}
        title={editingClassId ? "แก้ไขคลาส" : "เพิ่มคลาสใหม่"}
        subtitle={editingClassId ? "Edit Class" : "Add New Class"}
        wide
      >
        <form onSubmit={handleClassSubmit} className="space-y-4">
          <div>
            <label className="label-field">ชื่อคลาส / Class Name</label>
            <input
              className="input-field"
              value={classForm.name}
              onChange={(e) =>
                setClassForm({ ...classForm, name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="label-field">รายละเอียด / Description</label>
            <textarea
              className="input-field min-h-[60px] resize-none"
              value={classForm.description}
              onChange={(e) =>
                setClassForm({ ...classForm, description: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">เทรนเนอร์ / Trainer</label>
              <select
                className="input-field"
                value={classForm.trainerId}
                onChange={(e) =>
                  setClassForm({ ...classForm, trainerId: e.target.value })
                }
                required
              >
                <option value="">เลือกเทรนเนอร์</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">ตาราง / Schedule</label>
              <input
                className="input-field"
                value={classForm.schedule}
                onChange={(e) =>
                  setClassForm({ ...classForm, schedule: e.target.value })
                }
                placeholder="จ-ศ 18:00"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-field">ที่นั่ง / Capacity</label>
              <input
                type="number"
                className="input-field"
                value={classForm.capacity}
                onChange={(e) =>
                  setClassForm({
                    ...classForm,
                    capacity: Number(e.target.value),
                  })
                }
                min={1}
              />
            </div>
            <div>
              <label className="label-field">นาที / Duration</label>
              <input
                type="number"
                className="input-field"
                value={classForm.duration}
                onChange={(e) =>
                  setClassForm({
                    ...classForm,
                    duration: Number(e.target.value),
                  })
                }
                min={15}
              />
            </div>
            <div>
              <label className="label-field">ราคา / Price (฿)</label>
              <input
                type="number"
                className="input-field"
                value={classForm.price}
                onChange={(e) =>
                  setClassForm({
                    ...classForm,
                    price: Number(e.target.value),
                  })
                }
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="label-field">สถานะ / Status</label>
            <select
              className="input-field"
              value={classForm.status}
              onChange={(e) =>
                setClassForm({
                  ...classForm,
                  status: e.target.value as "active" | "inactive",
                })
              }
            >
              <option value="active">เปิดสอน</option>
              <option value="inactive">ปิด</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editingClassId ? "บันทึก" : "เพิ่มคลาส"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={closeModal}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </Modal>

      {/* Package modal */}
      <Modal
        open={modalMode === "package"}
        onClose={closeModal}
        title={editingPackageId ? "แก้ไขแพ็กเกจ" : "เพิ่มแพ็กเกจใหม่"}
        subtitle={editingPackageId ? "Edit Package" : "Add New Package"}
        wide
      >
        <form onSubmit={handlePackageSubmit} className="space-y-4">
          <div>
            <label className="label-field">ชื่อแพ็กเกจ / Package Name</label>
            <input
              className="input-field"
              value={packageForm.name}
              onChange={(e) =>
                setPackageForm({ ...packageForm, name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="label-field">รายละเอียด / Description</label>
            <textarea
              className="input-field min-h-[60px] resize-none"
              value={packageForm.description}
              onChange={(e) =>
                setPackageForm({
                  ...packageForm,
                  description: e.target.value,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">ราคา / Price (฿)</label>
              <input
                type="number"
                className="input-field"
                value={packageForm.price}
                onChange={(e) =>
                  setPackageForm({
                    ...packageForm,
                    price: Number(e.target.value),
                  })
                }
                min={0}
              />
            </div>
            <div>
              <label className="label-field">ระยะเวลา / Duration (วัน)</label>
              <input
                type="number"
                className="input-field"
                value={packageForm.durationDays}
                onChange={(e) =>
                  setPackageForm({
                    ...packageForm,
                    durationDays: Number(e.target.value),
                  })
                }
                min={1}
              />
            </div>
          </div>
          <div>
            <label className="label-field">
              จำนวนครั้ง PT / Session limit
            </label>
            <input
              type="number"
              className="input-field"
              value={packageForm.sessionLimit}
              onChange={(e) =>
                setPackageForm({
                  ...packageForm,
                  sessionLimit:
                    e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              min={0}
              placeholder="ว่างไว้ = ไม่จำกัดครั้ง (แบบรายเดือน)"
            />
            <p className="mt-1 text-xs text-slate-400">
              ใส่จำนวนครั้ง เช่น 10 สำหรับแพ็กเกจ PT 10 ครั้ง / 30 วัน
            </p>
          </div>
          <div>
            <label className="label-field">
              ฟีเจอร์ / Features (บรรทัดละ 1 รายการ)
            </label>
            <textarea
              className="input-field min-h-[100px] resize-none"
              value={packageForm.features}
              onChange={(e) =>
                setPackageForm({ ...packageForm, features: e.target.value })
              }
              placeholder="แดชบอร์ดสรุปคลาส สมาชิก และยอดขาย&#10;ระบบจองคลาส เทรนเนอร์ และพื้นที่"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">สถานะ / Status</label>
              <select
                className="input-field"
                value={packageForm.status}
                onChange={(e) =>
                  setPackageForm({
                    ...packageForm,
                    status: e.target.value as "active" | "inactive",
                  })
                }
              >
                <option value="active">เปิดใช้งาน</option>
                <option value="inactive">ปิด</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={packageForm.popular}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      popular: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                แพ็กเกจยอดนิยม / Popular
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editingPackageId ? "บันทึก" : "เพิ่มแพ็กเกจ"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={closeModal}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
