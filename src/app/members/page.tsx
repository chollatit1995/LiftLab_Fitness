"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { useData } from "@/lib/data-context";
import {
  formatCurrency,
  formatDate,
  generateId,
  statusColors,
} from "@/lib/store";
import { can } from "@/lib/permissions";
import { Member, Sale } from "@/lib/types";

type MemberStatus = Member["status"];
type StatusFilter = "all" | MemberStatus;

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  packageId: "",
  status: "active" as MemberStatus,
  notes: "",
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function daysUntil(dateStr: string): number {
  const today = new Date(todayISO() + "T00:00:00");
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const statusLabels: Record<MemberStatus, string> = {
  active: "ใช้งาน",
  pending: "รอดำเนินการ",
  expired: "หมดอายุ",
};

export default function MembersPage() {
  const { data, updateData, hydrated } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [renewPackageId, setRenewPackageId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [role, setRole] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role ?? ""))
      .catch(() => setRole(""));
  }, []);

  const canDelete = can(role, "members.delete");

  const activePackages = data.packages.filter((p) => p.status === "active");

  const counts = useMemo(
    () => ({
      all: data.members.length,
      active: data.members.filter((m) => m.status === "active").length,
      pending: data.members.filter((m) => m.status === "pending").length,
      expired: data.members.filter((m) => m.status === "expired").length,
    }),
    [data.members]
  );

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.members
      .filter((m) => (statusFilter === "all" ? true : m.status === statusFilter))
      .filter((m) => {
        if (!q) return true;
        const pkg = data.packages.find((p) => p.id === m.packageId);
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          (pkg?.name.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  }, [data.members, data.packages, search, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      packageId: activePackages[0]?.id ?? "",
    });
    setModalOpen(true);
  };

  const openEdit = (member: Member) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone,
      packageId: member.packageId,
      status: member.status,
      notes: "",
    });
    setModalOpen(true);
  };

  const openRenew = (member: Member) => {
    setRenewingId(member.id);
    setRenewPackageId(member.packageId || activePackages[0]?.id || "");
    setRenewModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pkg = data.packages.find((p) => p.id === form.packageId);
    if (!pkg) return;

    if (editingId) {
      updateData((prev) => ({
        ...prev,
        members: prev.members.map((m) => {
          if (m.id !== editingId) return m;
          const packageChanged = m.packageId !== form.packageId;
          return {
            ...m,
            name: form.name,
            email: form.email,
            phone: form.phone,
            packageId: form.packageId,
            status: form.status,
            expiresAt: packageChanged
              ? addDays(m.joinedAt, pkg.durationDays)
              : m.expiresAt,
          };
        }),
      }));
    } else {
      const joinedAt = todayISO();
      const newMember: Member = {
        id: generateId("m"),
        name: form.name,
        email: form.email,
        phone: form.phone,
        packageId: form.packageId,
        joinedAt,
        expiresAt: addDays(joinedAt, pkg.durationDays),
        status: form.status,
      };

      const sale: Sale | null =
        form.status === "active"
          ? {
              id: generateId("sl"),
              memberId: newMember.id,
              memberName: newMember.name,
              item: `${pkg.name} Package (${pkg.durationDays} วัน)`,
              amount: pkg.price,
              date: joinedAt,
              type: "membership",
            }
          : null;

      updateData((prev) => ({
        ...prev,
        members: [...prev.members, newMember],
        sales: sale ? [...prev.sales, sale] : prev.sales,
      }));
    }

    setModalOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleRenew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingId) return;
    const pkg = data.packages.find((p) => p.id === renewPackageId);
    const member = data.members.find((m) => m.id === renewingId);
    if (!pkg || !member) return;

    const base =
      member.expiresAt > todayISO() ? member.expiresAt : todayISO();
    const newExpires = addDays(base, pkg.durationDays);
    const saleDate = todayISO();

    const sale: Sale = {
      id: generateId("sl"),
      memberId: member.id,
      memberName: member.name,
      item: `ต่ออายุ ${pkg.name} (${pkg.durationDays} วัน)`,
      amount: pkg.price,
      date: saleDate,
      type: "membership",
    };

    updateData((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === renewingId
          ? {
              ...m,
              packageId: pkg.id,
              expiresAt: newExpires,
              status: "active" as const,
            }
          : m
      ),
      sales: [...prev.sales, sale],
    }));

    setRenewModalOpen(false);
    setRenewingId(null);
  };

  const deleteMember = (id: string) => {
    if (!canDelete) return;
    if (!confirm("ต้องการลบสมาชิกคนนี้? การจองที่เกี่ยวข้องจะยังคงอยู่")) return;
    updateData((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== id),
    }));
  };

  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const renewingMember = data.members.find((m) => m.id === renewingId);
  const renewPkg = data.packages.find((p) => p.id === renewPackageId);

  return (
    <div>
      <PageHeader
        titleTh="จัดการสมาชิก"
        titleEn="Member Management"
        descriptionTh="เพิ่ม แก้ไข ค้นหา และต่ออายุสมาชิก LiftLab Fitness"
        descriptionEn="Add, edit, search, and renew memberships"
        action={
          <button className="btn-primary" onClick={openCreate}>
            <span className="material-symbols-outlined text-[18px]">
              person_add
            </span>
            เพิ่มสมาชิก
          </button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {(
          [
            { key: "all" as const, label: "ทั้งหมด", color: "text-slate-900" },
            {
              key: "active" as const,
              label: "ใช้งาน",
              color: "text-emerald-600",
            },
            {
              key: "pending" as const,
              label: "รอดำเนินการ",
              color: "text-amber-600",
            },
            {
              key: "expired" as const,
              label: "หมดอายุ",
              color: "text-red-500",
            },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setStatusFilter(item.key)}
            className={`card p-4 text-center transition ${
              statusFilter === item.key
                ? "ring-2 ring-brand-500 ring-offset-1"
                : "hover:bg-slate-50"
            }`}
          >
            <p className={`text-2xl font-bold ${item.color}`}>{counts[item.key]}</p>
            <p className="text-xs font-medium text-slate-600">{item.label}</p>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
            search
          </span>
          <input
            className="input-field pl-10"
            placeholder="ค้นหาชื่อ อีเมล โทรศัพท์ หรือแพ็กเกจ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">ชื่อ / Name</th>
                <th className="px-5 py-3 font-medium">ติดต่อ / Contact</th>
                <th className="px-5 py-3 font-medium">แพ็กเกจ / Package</th>
                <th className="px-5 py-3 font-medium">เริ่ม / Joined</th>
                <th className="px-5 py-3 font-medium">หมดอายุ / Expires</th>
                <th className="px-5 py-3 font-medium">สถานะ / Status</th>
                <th className="px-5 py-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    ไม่พบสมาชิกที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const pkg = data.packages.find((p) => p.id === member.packageId);
                  const remaining = daysUntil(member.expiresAt);
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                            {member.name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-900">
                            {member.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-slate-700">{member.email}</p>
                        <p className="text-xs text-slate-400">{member.phone}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">
                          {pkg?.name ?? "—"}
                        </p>
                        {pkg && (
                          <p className="text-xs text-slate-400">
                            {formatCurrency(pkg.price)} · {pkg.durationDays} วัน
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {formatDate(member.joinedAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-slate-700">
                          {formatDate(member.expiresAt)}
                        </p>
                        {member.status === "active" && (
                          <p
                            className={`text-xs ${
                              remaining <= 7
                                ? "text-amber-600"
                                : "text-slate-400"
                            }`}
                          >
                            {remaining < 0
                              ? "เลยกำหนดแล้ว"
                              : remaining === 0
                                ? "หมดอายุวันนี้"
                                : `เหลือ ${remaining} วัน`}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          label={statusLabels[member.status]}
                          className={statusColors[member.status]}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openRenew(member)}
                            title="ต่ออายุ"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              autorenew
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(member)}
                            title="แก้ไข"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              edit
                            </span>
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => deleteMember(member.id)}
                              title="ลบ"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                delete
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "แก้ไขสมาชิก" : "เพิ่มสมาชิกใหม่"}
        subtitle={editingId ? "Edit Member" : "Add New Member"}
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
          <div>
            <label className="label-field">แพ็กเกจสมาชิก / Package</label>
            <select
              className="input-field"
              value={form.packageId}
              onChange={(e) => setForm({ ...form, packageId: e.target.value })}
              required
            >
              <option value="" disabled>
                เลือกแพ็กเกจ
              </option>
              {data.packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} — {formatCurrency(pkg.price)} ({pkg.durationDays}{" "}
                  วัน)
                  {pkg.status !== "active" ? " [ปิด]" : ""}
                </option>
              ))}
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
                  status: e.target.value as MemberStatus,
                })
              }
            >
              <option value="active">ใช้งาน</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="expired">หมดอายุ</option>
            </select>
          </div>
          {!editingId && form.status === "active" && form.packageId && (
            <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
              จะบันทึกยอดขายแพ็กเกจอัตโนมัติ และตั้งวันหมดอายุตามระยะเวลาแพ็กเกจ
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editingId ? "บันทึก" : "เพิ่มสมาชิก"}
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

      <Modal
        open={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        title="ต่ออายุสมาชิก"
        subtitle="Renew Membership"
      >
        {renewingMember && (
          <form onSubmit={handleRenew} className="space-y-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="font-medium text-slate-900">{renewingMember.name}</p>
              <p className="text-xs text-slate-500">
                หมดอายุปัจจุบัน: {formatDate(renewingMember.expiresAt)}
              </p>
            </div>
            <div>
              <label className="label-field">แพ็กเกจต่ออายุ / Renew Package</label>
              <select
                className="input-field"
                value={renewPackageId}
                onChange={(e) => setRenewPackageId(e.target.value)}
                required
              >
                {activePackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} — {formatCurrency(pkg.price)} ({pkg.durationDays}{" "}
                    วัน)
                  </option>
                ))}
              </select>
            </div>
            {renewPkg && (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                วันหมดอายุใหม่จะเป็น{" "}
                {formatDate(
                  addDays(
                    renewingMember.expiresAt > todayISO()
                      ? renewingMember.expiresAt
                      : todayISO(),
                    renewPkg.durationDays
                  )
                )}{" "}
                และบันทึกยอดขาย {formatCurrency(renewPkg.price)}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                ยืนยันต่ออายุ
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRenewModalOpen(false)}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
