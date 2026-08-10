"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useData } from "@/lib/data-context";
import { downloadExcel, type ExcelSheet } from "@/lib/export-excel";
import { can } from "@/lib/permissions";
import {
  bookingsInRange,
  buildBookingSummary,
  buildMemberReport,
  buildPtReport,
  buildSalesSummary,
  defaultReportRange,
  packageName,
  rangePresets,
  renewalsInRange,
  ReportRange,
  salesInRange,
  bookingStatusLabel,
  memberStatusLabel,
  saleTypeLabel,
} from "@/lib/reports";
import {
  bookingTypeLabels,
  formatCurrency,
  formatDate,
} from "@/lib/store";
import { todayISO } from "@/lib/dates";

type ReportTab = "sales" | "members" | "bookings" | "pt";

const tabs: { key: ReportTab; label: string; needsSales?: boolean }[] = [
  { key: "sales", label: "ยอดขาย", needsSales: true },
  { key: "members", label: "สมาชิก" },
  { key: "bookings", label: "การจอง" },
  { key: "pt", label: "เซสชัน PT" },
];

export default function ReportsPage() {
  const { data, hydrated } = useData();
  const today = todayISO();
  const [role, setRole] = useState<string | null>(null);
  const [range, setRange] = useState<ReportRange>(() => defaultReportRange());
  const [preset, setPreset] = useState("30d");
  const [tab, setTab] = useState<ReportTab>("bookings");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const userRole = d.user?.role ?? null;
        setRole(userRole);
        if (userRole && can(userRole, "reports.sales")) {
          setTab("sales");
        }
      })
      .catch(() => setRole(null));
  }, []);

  const canSeeSales = role ? can(role, "reports.sales") : false;
  const visibleTabs = tabs.filter((t) => !t.needsSales || canSeeSales);

  const sales = useMemo(() => salesInRange(data, range), [data, range]);
  const bookings = useMemo(() => bookingsInRange(data, range), [data, range]);
  const renewals = useMemo(() => renewalsInRange(data, range), [data, range]);
  const salesSummary = useMemo(() => buildSalesSummary(sales), [sales]);
  const bookingSummary = useMemo(() => buildBookingSummary(bookings), [bookings]);
  const memberReport = useMemo(() => buildMemberReport(data, today), [data, today]);
  const ptReport = useMemo(() => buildPtReport(data, range), [data, range]);

  const applyPreset = (key: string) => {
    const found = rangePresets(today).find((p) => p.key === key);
    if (!found) return;
    setPreset(key);
    setRange(found.range);
  };

  const exportCurrent = () => {
    const stamp = `${range.from}_${range.to}`;
    if (tab === "sales" && canSeeSales) {
      downloadExcel(
        [
          {
            name: "ยอดขาย",
            rows: [
              ["วันที่", "สมาชิก", "รายการ", "ประเภท", "จำนวนเงิน", "โปรโมชั่น"],
              ...sales.map((s) => [
                s.date,
                s.memberName,
                s.item,
                saleTypeLabel[s.type],
                s.amount,
                s.promotionId ? "ใช่" : "",
              ]),
            ],
          },
          {
            name: "สรุปตามประเภท",
            rows: [
              ["ประเภท", "จำนวนรายการ", "ยอดรวม"],
              ...salesSummary.byType.map((r) => [r.label, r.count, r.amount]),
              ["รวม", salesSummary.count, salesSummary.total],
            ],
          },
        ],
        `liftlab-sales-${stamp}`
      );
      return;
    }

    if (tab === "members") {
      downloadExcel(
        [
          {
            name: "ใกล้หมดอายุ",
            rows: [
              ["ชื่อ", "อีเมล", "เบอร์", "แพ็กเกจ", "หมดอายุ", "สถานะ"],
              ...memberReport.expiringSoon.map((m) => [
                m.name,
                m.email,
                m.phone,
                packageName(data, m.packageId),
                m.expiresAt,
                memberStatusLabel[m.status],
              ]),
            ],
          },
          {
            name: "หมดอายุแล้ว",
            rows: [
              ["ชื่อ", "อีเมล", "เบอร์", "แพ็กเกจ", "หมดอายุ", "สถานะ"],
              ...memberReport.expired.map((m) => [
                m.name,
                m.email,
                m.phone,
                packageName(data, m.packageId),
                m.expiresAt,
                memberStatusLabel[m.status],
              ]),
            ],
          },
          {
            name: "ต่ออายุในช่วง",
            rows: [
              [
                "วันที่ต่ออายุ",
                "สมาชิก",
                "แพ็กเกจ",
                "ราคาเดิม",
                "ราคาสุทธิ",
                "โปรโมชั่น",
              ],
              ...renewals.map((r) => [
                r.renewedAt.slice(0, 10),
                r.memberName,
                r.packageName,
                r.originalPrice,
                r.finalPrice,
                r.promotionTitle ?? "",
              ]),
            ],
          },
        ],
        `liftlab-members-${stamp}`
      );
      return;
    }

    if (tab === "bookings") {
      downloadExcel(
        [
          {
            name: "การจอง",
            rows: [
              ["วันที่", "เวลา", "ประเภท", "รายการ", "สมาชิก", "สถานะ", "หมายเหตุ"],
              ...bookings.map((b) => {
                const member = data.members.find((m) => m.id === b.memberId);
                return [
                  b.date,
                  b.time,
                  bookingTypeLabels[b.type].th,
                  b.resourceName,
                  member?.name ?? "",
                  bookingStatusLabel[b.status],
                  b.notes ?? "",
                ];
              }),
            ],
          },
          {
            name: "สรุป",
            rows: [
              ["มิติ", "รายการ", "จำนวน"],
              ...bookingSummary.byType.map((r) => ["ประเภท", r.label, r.count]),
              ...bookingSummary.byStatus.map((r) => ["สถานะ", r.label, r.count]),
            ],
          },
        ],
        `liftlab-bookings-${stamp}`
      );
      return;
    }

    downloadExcel(
      [
        {
          name: "PT ตามเทรนเนอร์",
          rows: [
            ["เทรนเนอร์", "เซสชันที่เสร็จในช่วง"],
            ...ptReport.byTrainer.map((t) => [t.name, t.completed]),
          ],
        },
        {
          name: "โควต้าสมาชิก",
          rows: [
            ["สมาชิก", "ใช้แล้ว", "ทั้งหมด", "เหลือ", "สถานะ"],
            ...ptReport.membersWithQuota.map((m) => [
              m.name,
              m.sessionsUsed,
              m.sessionsTotal,
              m.remaining,
              memberStatusLabel[m.status],
            ]),
          ],
        },
      ],
      `liftlab-pt-${stamp}`
    );
  };

  const exportAll = () => {
    const stamp = `${range.from}_${range.to}`;
    const sheets: ExcelSheet[] = [];

    if (canSeeSales) {
      sheets.push({
        name: "ยอดขาย",
        rows: [
          ["วันที่", "สมาชิก", "รายการ", "ประเภท", "จำนวนเงิน"],
          ...sales.map((s) => [
            s.date,
            s.memberName,
            s.item,
            saleTypeLabel[s.type],
            s.amount,
          ]),
        ],
      });
    }

    sheets.push(
      {
        name: "การจอง",
        rows: [
          ["วันที่", "เวลา", "ประเภท", "รายการ", "สมาชิก", "สถานะ"],
          ...bookings.map((b) => {
            const member = data.members.find((m) => m.id === b.memberId);
            return [
              b.date,
              b.time,
              bookingTypeLabels[b.type].th,
              b.resourceName,
              member?.name ?? "",
              bookingStatusLabel[b.status],
            ];
          }),
        ],
      },
      {
        name: "ใกล้หมดอายุ",
        rows: [
          ["ชื่อ", "แพ็กเกจ", "หมดอายุ", "สถานะ"],
          ...memberReport.expiringSoon.map((m) => [
            m.name,
            packageName(data, m.packageId),
            m.expiresAt,
            memberStatusLabel[m.status],
          ]),
        ],
      },
      {
        name: "ต่ออายุ",
        rows: [
          ["วันที่", "สมาชิก", "แพ็กเกจ", "ราคาสุทธิ"],
          ...renewals.map((r) => [
            r.renewedAt.slice(0, 10),
            r.memberName,
            r.packageName,
            r.finalPrice,
          ]),
        ],
      },
      {
        name: "เซสชัน PT",
        rows: [
          ["เทรนเนอร์", "เสร็จในช่วง"],
          ...ptReport.byTrainer.map((t) => [t.name, t.completed]),
        ],
      }
    );

    downloadExcel(sheets, `liftlab-reports-${stamp}`);
  };

  if (!hydrated) return null;

  return (
    <div>
      <PageHeader
        icon="analytics"
        titleTh="รายงาน"
        titleEn="Reports"
        descriptionTh="ดูข้อมูลย้อนหลังตามช่วงเวลา และส่งออกไฟล์ Excel"
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={exportCurrent}>
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export แท็บนี้
            </button>
            <button type="button" className="btn-primary" onClick={exportAll}>
              <span className="material-symbols-outlined text-[18px]">table_view</span>
              Export ทั้งหมด
            </button>
          </div>
        }
      />

      {/* Range controls */}
      <div className="card mb-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">ช่วงเวลา</p>
            <div className="flex flex-wrap gap-1.5">
              {rangePresets(today).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    preset === p.key
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <div>
              <label className="label-field">จากวันที่</label>
              <input
                type="date"
                className="input-field"
                value={range.from}
                max={range.to}
                onChange={(e) => {
                  setPreset("custom");
                  setRange((prev) => ({ ...prev, from: e.target.value }));
                }}
              />
            </div>
            <div>
              <label className="label-field">ถึงวันที่</label>
              <input
                type="date"
                className="input-field"
                value={range.to}
                min={range.from}
                max={today}
                onChange={(e) => {
                  setPreset("custom");
                  setRange((prev) => ({ ...prev, to: e.target.value }));
                }}
              />
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          ช่วงที่เลือก: {formatDate(range.from)} – {formatDate(range.to)}
          {canSeeSales ? "" : " · พนักงานไม่เห็นรายงานยอดขาย"}
        </p>
      </div>

      {/* Summary chips — different from dashboard: range-scoped */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {canSeeSales && (
          <SummaryCard
            label="ยอดขายในช่วง"
            value={formatCurrency(salesSummary.total)}
            hint={`${salesSummary.count} รายการ`}
          />
        )}
        <SummaryCard
          label="การจองในช่วง"
          value={String(bookingSummary.total)}
          hint={bookingSummary.byStatus
            .map((s) => `${s.label} ${s.count}`)
            .join(" · ")}
        />
        <SummaryCard
          label="ใกล้หมดอายุ (14 วัน)"
          value={String(memberReport.expiringSoon.length)}
          hint={`หมดอายุแล้ว ${memberReport.expired.length} คน`}
        />
        <SummaryCard
          label="PT เสร็จในช่วง"
          value={String(ptReport.completedCount)}
          hint={`ต่ออายุ ${renewals.length} ครั้ง`}
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sales" && canSeeSales && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {salesSummary.byType.map((row) => (
              <div key={row.type} className="card p-4">
                <p className="text-sm text-slate-500">{row.label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatCurrency(row.amount)}
                </p>
                <p className="text-xs text-slate-400">{row.count} รายการ</p>
              </div>
            ))}
          </div>
          <DataTable
            empty="ไม่มียอดขายในช่วงนี้"
            headers={["วันที่", "สมาชิก", "รายการ", "ประเภท", "จำนวนเงิน"]}
            rows={sales.map((s) => [
              formatDate(s.date),
              s.memberName,
              s.item,
              saleTypeLabel[s.type],
              formatCurrency(s.amount),
            ])}
          />
        </div>
      )}

      {tab === "members" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {memberReport.byStatus.map((row) => (
              <div key={row.status} className="card p-4">
                <p className="text-sm text-slate-500">{row.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{row.count}</p>
              </div>
            ))}
          </div>
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <h2 className="font-semibold text-slate-900">ใกล้หมดอายุใน 14 วัน</h2>
            </div>
            <DataTable
              bare
              empty="ไม่มีสมาชิกใกล้หมดอายุ"
              headers={["ชื่อ", "แพ็กเกจ", "หมดอายุ", "ติดต่อ"]}
              rows={memberReport.expiringSoon.map((m) => [
                m.name,
                packageName(data, m.packageId),
                formatDate(m.expiresAt),
                m.phone || m.email,
              ])}
            />
          </section>
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <h2 className="font-semibold text-slate-900">
                ต่ออายุในช่วงที่เลือก ({renewals.length})
              </h2>
            </div>
            <DataTable
              bare
              empty="ไม่มีการต่ออายุในช่วงนี้"
              headers={["วันที่", "สมาชิก", "แพ็กเกจ", "ราคาสุทธิ", "โปร"]}
              rows={renewals.map((r) => [
                formatDate(r.renewedAt),
                r.memberName,
                r.packageName,
                formatCurrency(r.finalPrice),
                r.promotionTitle ?? "—",
              ])}
            />
          </section>
        </div>
      )}

      {tab === "bookings" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {bookingSummary.byType.map((row) => (
              <div key={row.type} className="card p-4">
                <p className="text-sm text-slate-500">{row.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{row.count}</p>
              </div>
            ))}
          </div>
          <DataTable
            empty="ไม่มีการจองในช่วงนี้"
            headers={["วันที่", "เวลา", "ประเภท", "รายการ", "สมาชิก", "สถานะ"]}
            rows={bookings.map((b) => {
              const member = data.members.find((m) => m.id === b.memberId);
              return [
                formatDate(b.date),
                b.time,
                bookingTypeLabels[b.type].th,
                b.resourceName,
                member?.name ?? "—",
                bookingStatusLabel[b.status],
              ];
            })}
          />
        </div>
      )}

      {tab === "pt" && (
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <h2 className="font-semibold text-slate-900">
                เซสชันที่เสร็จตามเทรนเนอร์ ({ptReport.completedCount})
              </h2>
            </div>
            <DataTable
              bare
              empty="ยังไม่มี PT ที่เสร็จในช่วงนี้"
              headers={["เทรนเนอร์", "จำนวนเซสชัน"]}
              rows={ptReport.byTrainer.map((t) => [t.name, String(t.completed)])}
            />
          </section>
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <h2 className="font-semibold text-slate-900">โควต้าเซสชันสมาชิก</h2>
              <p className="text-xs text-slate-500">
                สถานะปัจจุบัน ไม่ผูกกับช่วงวันที่ด้านบน
              </p>
            </div>
            <DataTable
              bare
              empty="ไม่มีสมาชิกที่มีโควต้า PT"
              headers={["สมาชิก", "ใช้แล้ว", "ทั้งหมด", "เหลือ", "สถานะ"]}
              rows={ptReport.membersWithQuota.map((m) => [
                m.name,
                String(m.sessionsUsed),
                String(m.sessionsTotal),
                String(m.remaining),
                memberStatusLabel[m.status],
              ])}
            />
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function DataTable({
  headers,
  rows,
  empty,
  bare = false,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
  bare?: boolean;
}) {
  const table = (
    <div className="overflow-x-auto">
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 sm:px-5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/80">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`whitespace-nowrap px-4 py-3 text-slate-700 sm:px-5 ${
                      j === 0 ? "font-medium text-slate-900" : ""
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  if (bare) return table;
  return <div className="card overflow-hidden">{table}</div>;
}
