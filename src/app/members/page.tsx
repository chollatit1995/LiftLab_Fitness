"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { PasswordField } from "@/components/PasswordField";
import { useData } from "@/lib/data-context";
import { daysUntil, todayISO, toISODate } from "@/lib/dates";
import {
  formatCurrency,
  formatDate,
  generateId,
  statusColors,
} from "@/lib/store";
import { can } from "@/lib/permissions";
import {
  bestOfferFor,
  livePromotions,
} from "@/lib/promotions";
import { Member, MembershipRenewal, Sale } from "@/lib/types";

type MemberStatus = Member["status"];
type StatusFilter = "all" | MemberStatus;

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  packageId: "",
  joinedAt: "",
  expiresAt: "",
  status: "active" as MemberStatus,
  notes: "",
};

function expiresFromPackage(
  joinedAt: string,
  packageId: string,
  packages: { id: string; durationDays: number }[]
): string {
  const pkg = packages.find((p) => p.id === packageId);
  if (!joinedAt || !pkg) return joinedAt || todayISO();
  return addDays(joinedAt, pkg.durationDays);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(toISODate(dateStr) + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const statusLabels: Record<MemberStatus, string> = {
  active: "ใช้งาน",
  pending: "รอดำเนินการ",
  expired: "หมดอายุ",
};

export default function MembersPage() {
  const { data, updateData, reloadData, hydrated } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [renewPackageId, setRenewPackageId] = useState("");
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewError, setRenewError] = useState("");
  const [memberRenewals, setMemberRenewals] = useState<MembershipRenewal[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [role, setRole] = useState("");
  const [portalMemberIds, setPortalMemberIds] = useState<string[]>([]);
  const [accessTarget, setAccessTarget] = useState<Member | null>(null);
  const [accessPassword, setAccessPassword] = useState("");
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");

  const loadPortalAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/members/access");
      if (res.ok) {
        const accounts: { memberId: string }[] = await res.json();
        setPortalMemberIds(accounts.map((a) => a.memberId));
      }
    } catch {
      setPortalMemberIds([]);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role ?? ""))
      .catch(() => setRole(""));
    loadPortalAccounts();
  }, [loadPortalAccounts]);

  const canDelete = can(role, "members.delete");
  const canGrantAccess = can(role, "members.grantAccess");

  const openAccess = (member: Member) => {
    setAccessTarget(member);
    setAccessPassword("");
    setAccessError("");
    setAccessMessage("");
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessTarget) return;

    setAccessSaving(true);
    setAccessError("");

    try {
      const res = await fetch("/api/members/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: accessTarget.id,
          email: accessTarget.email,
          password: accessPassword,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setAccessError(json.error || "ตั้งรหัสผ่านไม่สำเร็จ");
        return;
      }

      setAccessMessage(
        `ตั้งรหัสผ่านให้ ${accessTarget.name} แล้ว — แจ้งรหัสนี้ให้สมาชิกเข้าที่หน้า /portal/login`
      );
      await loadPortalAccounts();
    } catch {
      setAccessError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setAccessSaving(false);
    }
  };

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
    const joinedAt = todayISO();
    const packageId = activePackages[0]?.id ?? "";
    setForm({
      ...emptyForm,
      packageId,
      joinedAt,
      expiresAt: expiresFromPackage(joinedAt, packageId, data.packages),
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
      joinedAt: member.joinedAt,
      expiresAt: member.expiresAt,
      status: member.status,
      notes: "",
    });
    setModalOpen(true);
  };

  const openRenew = (member: Member) => {
    setRenewingId(member.id);
    setRenewPackageId(member.packageId || activePackages[0]?.id || "");
    setRenewError("");
    setRenewModalOpen(true);
  };

  const openHistory = async (member: Member) => {
    setHistoryMemberId(member.id);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/members/renewals?memberId=${member.id}`);
      if (res.ok) {
        setMemberRenewals(await res.json());
      } else {
        setMemberRenewals(
          data.membershipRenewals.filter((r) => r.memberId === member.id)
        );
      }
    } catch {
      setMemberRenewals(
        data.membershipRenewals.filter((r) => r.memberId === member.id)
      );
    } finally {
      setHistoryLoading(false);
    }
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
          return {
            ...m,
            name: form.name,
            email: form.email,
            phone: form.phone,
            packageId: form.packageId,
            joinedAt: form.joinedAt,
            expiresAt: form.expiresAt,
            status: form.status,
          };
        }),
        sales: prev.sales.map((s) =>
          s.memberId === editingId ? { ...s, memberName: form.name } : s
        ),
      }));
    } else {
      const newMember: Member = {
        id: generateId("m"),
        name: form.name,
        email: form.email,
        phone: form.phone,
        packageId: form.packageId,
        joinedAt: form.joinedAt,
        expiresAt: form.expiresAt,
        status: form.status,
      };

      const promos = livePromotions(data.promotions);
      const offer = bestOfferFor(pkg, promos);
      const finalPrice = offer?.price ?? pkg.price;
      const appliedPromo = offer?.promo ?? null;

      const sale: Sale | null =
        form.status === "active"
          ? {
              id: generateId("sl"),
              memberId: newMember.id,
              memberName: newMember.name,
              item: appliedPromo
                ? `${pkg.name} Package [${appliedPromo.title}]`
                : `${pkg.name} Package`,
              amount: finalPrice,
              date: form.joinedAt,
              type: "membership",
              originalAmount: appliedPromo ? pkg.price : undefined,
              promotionId: appliedPromo?.id ?? null,
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

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingId) return;
    const pkg = data.packages.find((p) => p.id === renewPackageId);
    const member = data.members.find((m) => m.id === renewingId);
    if (!pkg || !member) return;

    setRenewSaving(true);
    setRenewError("");

    try {
      const res = await fetch("/api/members/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: renewingId,
          packageId: renewPackageId,
          autoPromo: false,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setRenewError(json.error || "ต่ออายุไม่สำเร็จ");
        return;
      }

      await reloadData();
      setRenewModalOpen(false);
      setRenewingId(null);
    } catch {
      setRenewError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setRenewSaving(false);
    }
  };

  const deleteMember = async (id: string) => {
    if (!canDelete) return;
    if (
      !confirm(
        "ต้องการลบสมาชิกคนนี้? ยอดขายและการจองที่เกี่ยวข้องจะถูกลบด้วย"
      )
    )
      return;

    if (portalMemberIds.includes(id)) {
      try {
        await fetch(`/api/members/access?memberId=${id}`, { method: "DELETE" });
      } catch {
        /* ignore */
      }
    }

    updateData((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== id),
      sales: prev.sales.filter((s) => s.memberId !== id),
      bookings: prev.bookings.filter((b) => b.memberId !== id),
      membershipRenewals: prev.membershipRenewals.filter((r) => r.memberId !== id),
    }));

    loadPortalAccounts();
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
  const historyMember = data.members.find((m) => m.id === historyMemberId);

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
                            onClick={() => openHistory(member)}
                            title="ประวัติต่ออายุ"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              history
                            </span>
                          </button>
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
                          {canGrantAccess && (
                            <button
                              type="button"
                              onClick={() => openAccess(member)}
                              title={
                                portalMemberIds.includes(member.id)
                                  ? "รีเซ็ตรหัสผ่าน portal"
                                  : "เปิดใช้งาน portal"
                              }
                              className={`rounded-lg p-1.5 hover:bg-blue-50 hover:text-blue-600 ${
                                portalMemberIds.includes(member.id)
                                  ? "text-blue-500"
                                  : "text-slate-400"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {portalMemberIds.includes(member.id)
                                  ? "key"
                                  : "key_off"}
                              </span>
                            </button>
                          )}
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
              onChange={(e) => {
                const packageId = e.target.value;
                setForm((f) => ({
                  ...f,
                  packageId,
                  expiresAt: expiresFromPackage(
                    f.joinedAt || todayISO(),
                    packageId,
                    data.packages
                  ),
                }));
              }}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">วันเริ่มสมาชิก / Start Date</label>
              <input
                type="date"
                className="input-field"
                value={form.joinedAt}
                onChange={(e) => {
                  const joinedAt = e.target.value;
                  setForm((f) => ({
                    ...f,
                    joinedAt,
                    expiresAt: expiresFromPackage(
                      joinedAt,
                      f.packageId,
                      data.packages
                    ),
                  }));
                }}
                required
              />
            </div>
            <div>
              <label className="label-field">วันหมดอายุ / Expiry Date</label>
              <input
                type="date"
                className="input-field"
                value={form.expiresAt}
                min={form.joinedAt}
                onChange={(e) =>
                  setForm({ ...form, expiresAt: e.target.value })
                }
                required
              />
            </div>
          </div>
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            เลือกแพ็กเกจแล้วระบบจะเสนอวันหมดอายุให้อัตโนมัติ — แก้วันเริ่ม/หมดอายุเองได้ตามต้องการ
            (เหมาะสำหรับลงข้อมูลสมาชิกเก่า)
          </p>
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
              จะบันทึกยอดขายแพ็กเกจอัตโนมัติตามวันเริ่มที่กำหนด
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
        open={accessTarget !== null}
        onClose={() => setAccessTarget(null)}
        title={
          accessTarget && portalMemberIds.includes(accessTarget.id)
            ? "รีเซ็ตรหัสผ่าน Portal"
            : "เปิดใช้งาน Member Portal"
        }
        subtitle="Member Portal Access"
      >
        {accessTarget && (
          <form onSubmit={handleGrantAccess} className="space-y-4">
            {accessError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {accessError}
              </div>
            )}
            {accessMessage ? (
              <>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {accessMessage}
                </div>
                <div className="rounded-xl bg-slate-900 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    รหัสผ่านที่ตั้งไว้
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-white">
                    {accessPassword}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  จดหรือคัดลอกไว้ก่อนปิดหน้าต่างนี้ — ระบบจะไม่แสดงรหัสนี้อีก
                  หากลืมให้กดตั้งรหัสใหม่ได้ตลอด
                </p>
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => setAccessTarget(null)}
                >
                  เสร็จสิ้น
                </button>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {accessTarget.name}
                  </p>
                  <p className="text-xs text-slate-500">{accessTarget.email}</p>
                </div>

                <PasswordField
                  value={accessPassword}
                  onChange={setAccessPassword}
                  hint="กดลูกเต๋าเพื่อสุ่มรหัส แล้วกดคัดลอกไปแจ้งสมาชิก — เขาจะต้องเปลี่ยนรหัสเองเมื่อเข้าครั้งแรก"
                />

                <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  สมาชิกเข้าใช้งานที่ <span className="font-medium">/portal/login</span>{" "}
                  เพื่อดูแพ็กเกจ วันหมดอายุ และตารางการจองของตัวเอง
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={accessSaving}
                    className="btn-primary flex-1 disabled:opacity-60"
                  >
                    {accessSaving ? "กำลังบันทึก..." : "บันทึกรหัสผ่าน"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setAccessTarget(null)}
                  >
                    ยกเลิก
                  </button>
                </div>
              </>
            )}
          </form>
        )}
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
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <p>
                  วันหมดอายุใหม่:{" "}
                  <strong>
                    {formatDate(
                      addDays(
                        renewingMember.expiresAt > todayISO()
                          ? renewingMember.expiresAt
                          : todayISO(),
                        renewPkg.durationDays
                      )
                    )}
                  </strong>
                </p>
                <p className="mt-2 text-lg font-bold">
                  {formatCurrency(renewPkg.price)}
                </p>
              </div>
            )}
            {renewError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {renewError}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={renewSaving}
              >
                {renewSaving ? "กำลังบันทึก..." : "ยืนยันต่ออายุ"}
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

      <Modal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="ประวัติการต่ออายุ"
        subtitle={historyMember?.name ?? "Renewal History"}
        wide
      >
        {historyLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : memberRenewals.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            ยังไม่มีประวัติการต่ออายุ
          </p>
        ) : (
          <div className="space-y-3">
            {memberRenewals.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{r.packageName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(r.renewedAt)}
                      {r.renewedBy && ` · โดย ${r.renewedBy}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {r.finalPrice < r.originalPrice ? (
                      <>
                        <p className="font-bold text-rose-600">
                          {formatCurrency(r.finalPrice)}
                        </p>
                        <p className="text-xs text-slate-400 line-through">
                          {formatCurrency(r.originalPrice)}
                        </p>
                      </>
                    ) : (
                      <p className="font-bold text-slate-900">
                        {formatCurrency(r.finalPrice)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                    {formatDate(r.previousExpiresAt)} → {formatDate(r.newExpiresAt)}
                  </span>
                  {r.promotionTitle && (
                    <span className="rounded-lg bg-rose-50 px-2 py-1 text-rose-700">
                      {r.promotionTitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
