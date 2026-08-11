"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { AppUser, AppUserRole } from "@/lib/user-types";
import { statusColors } from "@/lib/store";
import {
  ENGLISH_NAME_ERROR,
  ENGLISH_NAME_HINT,
  ENGLISH_NAME_PATTERN,
  englishNameOrError,
  filterEnglishNameInput,
} from "@/lib/name";

const userRoleLabels: Record<AppUserRole, string> = {
  admin: "ผู้ดูแลระบบ",
  manager: "ผู้จัดการ",
  staff: "พนักงาน",
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "staff" as AppUserRole,
  status: "active" as "active" | "inactive",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [currentRole, setCurrentRole] = useState<string>("");

  const loadUsers = useCallback(async () => {
    try {
      const [usersRes, meRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/auth/me"),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setCurrentRole(me.user?.role ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const isAdmin = currentRole === "admin";

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (user: AppUser) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const checkedName = englishNameOrError(form.name);
    if (!checkedName.ok) {
      setError(checkedName.error);
      return;
    }

    if (!editingId && !form.password) {
      setError("กรุณาตั้งรหัสผ่าน");
      return;
    }

    const payload = { ...form, name: checkedName.name };

    const res = await fetch("/api/users", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingId
          ? { id: editingId, ...payload, password: payload.password || undefined }
          : payload
      ),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "เกิดข้อผิดพลาด");
      return;
    }

    setModalOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    loadUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("ต้องการลบผู้ใช้นี้?")) return;

    const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "ลบไม่สำเร็จ");
      return;
    }
    loadUsers();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        titleTh="จัดการผู้ใช้งานระบบ"
        titleEn="User Management"
        descriptionTh="เพิ่ม แก้ไข ลบ บัญชีผู้ใช้ที่เข้าสู่ระบบได้"
        descriptionEn="Manage login accounts stored in database"
        action={
          isAdmin ? (
            <button className="btn-primary" onClick={openCreate}>
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              เพิ่มผู้ใช้
            </button>
          ) : undefined
        }
      />

      {!isAdmin && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          คุณสามารถดูรายชื่อได้อย่างเดียว — การเพิ่ม/แก้ไข/ลบ ต้องใช้บัญชี Admin
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">ชื่อ / Name</th>
                <th className="px-5 py-3 font-medium">อีเมล / Email</th>
                <th className="px-5 py-3 font-medium">บทบาท / Role</th>
                <th className="px-5 py-3 font-medium">สถานะ / Status</th>
                <th className="px-5 py-3 font-medium">สร้างเมื่อ / Created</th>
                {isAdmin && (
                  <th className="px-5 py-3 font-medium">จัดการ</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-900">
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{user.email}</td>
                  <td className="px-5 py-3.5">
                    <Badge
                      label={userRoleLabels[user.role]}
                      className="bg-blue-50 text-blue-700"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      label={user.status === "active" ? "ใช้งาน" : "ปิด"}
                      className={statusColors[user.status]}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {user.createdAt}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">
            ยังไม่มีผู้ใช้ — เรียก{" "}
            <code className="rounded bg-slate-100 px-1">/api/db/migrate</code>{" "}
            เพื่อสร้างบัญชีเริ่มต้น
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}
        subtitle={editingId ? "Edit User" : "Add New User"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="label-field">ชื่อ-นามสกุล / Name</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: filterEnglishNameInput(e.target.value) })
              }
              placeholder="Somchai Jaidee"
              pattern={ENGLISH_NAME_PATTERN}
              title={ENGLISH_NAME_ERROR}
              lang="en"
              autoComplete="name"
              required
            />
            <p className="mt-1 text-xs text-slate-400">{ENGLISH_NAME_HINT}</p>
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
            <label className="label-field">
              รหัสผ่าน / Password
              {editingId && (
                <span className="font-normal text-slate-400">
                  {" "}(เว้นว่างถ้าไม่เปลี่ยน)
                </span>
              )}
            </label>
            <input
              type="password"
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editingId}
              minLength={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">บทบาท / Role</label>
              <select
                className="input-field"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as AppUserRole })
                }
              >
                <option value="admin">ผู้ดูแลระบบ</option>
                <option value="manager">ผู้จัดการ</option>
                <option value="staff">พนักงาน</option>
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
                <option value="inactive">ปิด</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editingId ? "บันทึก" : "เพิ่มผู้ใช้"}
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
