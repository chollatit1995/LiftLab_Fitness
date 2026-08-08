"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const navItems = [
  {
    href: "/",
    icon: "dashboard",
    labelTh: "แดชบอร์ด",
    labelEn: "Dashboard",
  },
  {
    href: "/bookings",
    icon: "event",
    labelTh: "จองคลาส / PT / พื้นที่",
    labelEn: "Bookings",
  },
  {
    href: "/staff",
    icon: "group",
    labelTh: "จัดการพนักงาน",
    labelEn: "Staff",
  },
  {
    href: "/classes",
    icon: "fitness_center",
    labelTh: "คลาส & แพ็กเกจ",
    labelEn: "Classes & Packages",
  },
];

function MaterialIcon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined text-[20px] leading-none">
      {name}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        rel="stylesheet"
      />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
              <MaterialIcon name="fitness_center" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">
                LiftLab Fitness
              </p>
              <p className="text-xs text-slate-500">
                ระบบบริหารจัดการฟิตเนส
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <MaterialIcon name={item.icon} />
                  <span>{item.labelTh}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              ● ระบบพร้อมใช้งาน
            </span>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 md:hidden">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600"
              }`}
            >
              <MaterialIcon name={item.icon} />
              {item.labelTh}
            </Link>
          );
        })}
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-500 sm:px-6">
          © 2026 LiftLab Fitness — ระบบจัดการฟิตเนสครบวงจร
        </div>
      </footer>
    </div>
  );
}
