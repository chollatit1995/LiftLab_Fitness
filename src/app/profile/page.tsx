"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { AppUser } from "@/lib/user-types";
import { isValidRole, roleLabels } from "@/lib/permissions";
import { formatDate } from "@/lib/store";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/profile");
      if (res.ok) {
        const data: AppUser = await res.json();
        setUser(data);
        setName(data.name);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    setNameError("");
    setNameMessage("");
    setSavingName(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();

      if (!res.ok) {
        setNameError(data.error || "บันทึกไม่สำเร็จ");
        return;
      }

      setUser(data);
      setNameMessage("บันทึกชื่อเรียบร้อยแล้ว");
      router.refresh();
    } catch {
      setNameError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword !== confirmPassword) {
      setPasswordError("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
        return;
      }

      setPasswordMessage("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSavingPassword(false);
    }
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
        titleTh="โปรไฟล์ของฉัน"
        titleEn="My Profile"
        descriptionTh="แก้ไขชื่อที่แสดงและเปลี่ยนรหัสผ่านของบัญชีคุณ"
        descriptionEn="Update your display name and password"
      />

      {user && (
        <div className="card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              label={
                isValidRole(user.role) ? roleLabels[user.role].th : user.role
              }
              className="bg-blue-50 text-blue-700"
            />
            {user.lastLoginAt && (
              <span className="text-xs text-slate-400">
                เข้าใช้งานล่าสุด {formatDate(user.lastLoginAt)}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title">ข้อมูลบัญชี</h2>
          <p className="mb-4 text-xs text-slate-500">Account Information</p>

          <form onSubmit={handleSaveName} className="space-y-4">
            {nameError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {nameError}
              </div>
            )}
            {nameMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {nameMessage}
              </div>
            )}

            <div>
              <label className="label-field">ชื่อที่แสดง / Display Name</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label-field">อีเมล / Email</label>
              <input
                className="input-field bg-slate-50 text-slate-500"
                value={user?.email ?? ""}
                disabled
              />
              <p className="mt-1.5 text-xs text-slate-400">
                อีเมลเปลี่ยนได้โดยผู้ดูแลระบบเท่านั้น
              </p>
            </div>

            <button
              type="submit"
              disabled={savingName}
              className="btn-primary disabled:opacity-60"
            >
              {savingName ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
          </form>
        </div>

        <div className="card p-5">
          <h2 className="section-title">เปลี่ยนรหัสผ่าน</h2>
          <p className="mb-4 text-xs text-slate-500">Change Password</p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {passwordError}
              </div>
            )}
            {passwordMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {passwordMessage}
              </div>
            )}

            <div>
              <label className="label-field">รหัสผ่านปัจจุบัน / Current</label>
              <input
                type="password"
                className="input-field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="label-field">รหัสผ่านใหม่ / New</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                อย่างน้อย 8 ตัวอักษร และต้องมีทั้งตัวอักษรและตัวเลข
              </p>
            </div>

            <div>
              <label className="label-field">ยืนยันรหัสผ่านใหม่ / Confirm</label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="btn-primary disabled:opacity-60"
            >
              {savingPassword ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
