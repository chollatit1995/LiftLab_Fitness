"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { useData } from "@/lib/data-context";
import { generateId, roleLabels, statusColors } from "@/lib/store";
import { Staff, StaffRole } from "@/lib/types";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  role: "front_desk" as StaffRole,
  status: "active" as "active" | "inactive",
};

export default function StaffPage() {
  const { data, updateData, hydrated } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (staff: Staff) => {
    setEditingId(staff.id);
    setForm({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      status: staff.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      updateData((prev) => ({
        ...prev,
        staff: prev.staff.map((s) =>
          s.id === editingId ? { ...s, ...form } : s
        ),
      }));
    } else {
      const newStaff: Staff = {
        id: generateId("s"),
        ...form,
        joinedAt: new Date().toISOString().split("T")[0],
      };
      updateData((prev) => ({
        ...prev,
        staff: [...prev.staff, newStaff],
      }));
    }

    setModalOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const deleteStaff = (id: string) => {
    if (!confirm("ต้องการลบพนักงานคนนี้?")) return;
    updateData((prev) => ({
      ...prev,
      staff: prev.staff.filter((s) => s.id !== id),
    }));
  };

  if (!hydrated) return null;

  const roleCounts = data.staff.reduce(
    (acc, s) => {
      acc[s.role] = (acc[s.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div>
      <PageHeader
        titleTh="จัดการพนักงาน"
        titleEn="Staff Management"
        descriptionTh="จัดการข้อมูลพนักงาน เทรนเนอร์ และทีมงาน LiftLab Fitness"
        descriptionEn="Manage staff, trainers, and team members"
        action={
          <button className="btn-primary" onClick={openCreate}>
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            เพิ่มพนักงาน
          </button>
        }
      />

      {/* Role summary */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {(["manager", "trainer", "front_desk", "admin"] as StaffRole[]).map(
          (role) => (
            <div key={role} className="card p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {roleCounts[role] || 0}
              </p>
              <p className="text-xs font-medium text-slate-600">
                {roleLabels[role].th}
              </p>
            </div>
          )
        )}
      </div>

      {/* Staff table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">ชื่อ / Name</th>
                <th className="px-5 py-3 font-medium">อีเมล / Email</th>
                <th className="px-5 py-3 font-medium">โทรศัพท์ / Phone</th>
                <th className="px-5 py-3 font-medium">ตำแหน่ง / Role</th>
                <th className="px-5 py-3 font-medium">วันที่เริ่ม / Joined</th>
                <th className="px-5 py-3 font-medium">สถานะ / Status</th>
                <th className="px-5 py-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.staff.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                        {staff.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-900">
                        {staff.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{staff.email}</td>
                  <td className="px-5 py-3.5 text-slate-600">{staff.phone}</td>
                  <td className="px-5 py-3.5">
                    <Badge
                      label={roleLabels[staff.role].th}
                      className="bg-blue-50 text-blue-700"
                    />
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {staff.joinedAt}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      label={staff.status === "active" ? "ใช้งาน" : "ไม่ใช้งาน"}
                      className={statusColors[staff.status]}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(staff)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          edit
                        </span>
                      </button>
                      <button
                        onClick={() => deleteStaff(staff.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "แก้ไขพนักงาน" : "เพิ่มพนักงานใหม่"}
        subtitle={editingId ? "Edit Staff" : "Add New Staff"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">ชื่อ-นามสกุล / Full Name</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label-field">อีเมล / Email</label>
            <input
              type="email"
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label-field">โทรศัพท์ / Phone</label>
            <input
              className="input-field"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">ตำแหน่ง / Role</label>
              <select
                className="input-field"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as StaffRole })
                }
              >
                <option value="manager">ผู้จัดการ</option>
                <option value="trainer">เทรนเนอร์</option>
                <option value="front_desk">แคชเชียร์/ต้อนรับ</option>
                <option value="admin">ผู้ดูแลระบบ</option>
              </select>
            </div>
            <div>
              <label className="label-field">สถานะ / Status</label>
              <select
                className="input-field"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as "active" | "inactive",
                  })
                }
              >
                <option value="active">ใช้งาน</option>
                <option value="inactive">ไม่ใช้งาน</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editingId ? "บันทึก" : "เพิ่มพนักงาน"}
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
