"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isValidRole, navItemsForRole, roleLabels } from "@/lib/permissions";
import { useData } from "@/lib/data-context";

interface User {
  email: string;
  name: string;
  role: string;
}

const BARE_LAYOUT_PATHS = ["/login", "/change-password"];
const BARE_LAYOUT_PREFIXES = ["/portal"];
const EXPIRY_WARNING_SECONDS = 5 * 60;

function MaterialIcon({ name, className = "text-[20px]" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined leading-none ${className}`}>
      {name}
    </span>
  );
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function pageTitle(pathname: string): string {
  const map: Record<string, string> = {
    "/": "แดชบอร์ด",
    "/members": "สมาชิก",
    "/bookings": "การจอง",
    "/classes": "คลาส & แพ็กเกจ",
    "/staff": "พนักงาน",
    "/promotions/manage": "โปรโมชั่น",
    "/reports": "รายงาน",
    "/users": "ผู้ใช้งาน",
    "/profile": "โปรไฟล์",
  };
  for (const [path, title] of Object.entries(map)) {
    if (isActivePath(pathname, path)) return title;
  }
  return "LiftLab Fitness";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { hydrated: dataHydrated, usingDatabase } = useData();
  const [user, setUser] = useState<User | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const expiredSyncRef = useRef(false);

  const isBareLayout =
    BARE_LAYOUT_PATHS.includes(pathname) ||
    BARE_LAYOUT_PREFIXES.some((p) => pathname.startsWith(p));

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setUser(data.user);
      setExpiresAt(data.user ? (data.expiresAt ?? null) : null);
    } catch {
      setUser(null);
      setExpiresAt(null);
    }
  }, []);

  useEffect(() => {
    if (isBareLayout) return;
    loadSession();
  }, [isBareLayout, pathname, loadSession]);

  useEffect(() => {
    if (isBareLayout) return;
    const sync = () => loadSession();
    const interval = setInterval(sync, 5 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isBareLayout, loadSession]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!user || !expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const updateCountdown = () => {
      setSecondsLeft(expiresAt - Math.floor(Date.now() / 1000));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 30_000);
    return () => clearInterval(timer);
  }, [expiresAt, user]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft > 0) {
      expiredSyncRef.current = false;
      return;
    }
    if (!user || expiredSyncRef.current) return;
    expiredSyncRef.current = true;
    loadSession();
  }, [secondsLeft, user, loadSession]);

  const navItems = useMemo(
    () => (user ? navItemsForRole(user.role) : []),
    [user]
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const handleExtendSession = async () => {
    await fetch("/api/auth/me", { cache: "no-store" });
    await loadSession();
  };

  if (isBareLayout) {
    return <>{children}</>;
  }

  const showExpiryWarning =
    secondsLeft !== null &&
    secondsLeft > 0 &&
    secondsLeft <= EXPIRY_WARNING_SECONDS;

  const showOfflineWarning = dataHydrated && !usingDatabase;

  const todayLabel = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="border-b border-white/10 px-5 py-6">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="LiftLab Fitness"
            className="h-11 w-11 shrink-0 rounded-full object-cover shadow-lg shadow-black/30 ring-1 ring-white/20"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">LiftLab Fitness</p>
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-emerald-300/80">
              Admin Panel
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          เมนูหลัก
        </p>
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-400 to-emerald-400" />
              )}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                  active
                    ? "bg-gradient-to-br from-brand-500 to-emerald-500 text-white shadow-md"
                    : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white"
                }`}
              >
                <MaterialIcon name={item.icon} className="text-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.labelTh}</span>
                <span className="block truncate text-[10px] font-normal text-slate-500 group-hover:text-slate-400">
                  {item.labelEn}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-4">
        {user && (
          <Link
            href="/profile"
            className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
              pathname.startsWith("/profile")
                ? "bg-white/10"
                : "hover:bg-white/5"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-emerald-400 text-sm font-bold text-white">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-[11px] text-slate-400">
                {isValidRole(user.role) ? roleLabels[user.role].th : user.role}
              </p>
            </div>
            <MaterialIcon name="chevron_right" className="text-[18px] text-slate-600" />
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
        >
          <MaterialIcon name="logout" className="text-[18px]" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-surface min-h-screen">
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        rel="stylesheet"
      />

      {/* Decorative bg */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden lg:pl-[var(--sidebar-width)]">
        <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-brand-200/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-200/15 blur-3xl" />
      </div>

      {/* Sidebar desktop */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 lg:block"
        style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.12)" }}
      >
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="ปิดเมนู"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="ปิด"
              >
                <MaterialIcon name="close" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="relative lg:pl-[var(--sidebar-width)]">
        {/* Top bar — desktop */}
        <header className="sticky top-0 z-30 hidden border-b border-slate-200/60 bg-white/80 backdrop-blur-xl lg:block">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <div>
              <p className="text-sm font-bold text-slate-900">{pageTitle(pathname)}</p>
              <p className="text-xs text-slate-400">{todayLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              {usingDatabase && (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  เชื่อมต่อ DB แล้ว
                </span>
              )}
              {user && (
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 transition hover:border-brand-200 hover:bg-brand-50"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-emerald-500 text-xs font-bold text-white">
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{user.name}</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Top bar — mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/60 bg-white/90 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
            aria-label="เปิดเมนู"
          >
            <MaterialIcon name="menu" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">
              {pageTitle(pathname)}
            </p>
          </div>
          {user && (
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-emerald-500 text-xs font-bold text-white"
            >
              {user.name.charAt(0)}
            </Link>
          )}
        </header>

        {showOfflineWarning && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2.5 sm:px-6">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 text-sm text-red-800">
              <MaterialIcon name="cloud_off" className="text-[18px]" />
              <span>
                <strong className="font-semibold">ยังไม่ได้เชื่อมกับฐานข้อมูล</strong>{" "}
                — ข้อมูลอาจไม่ sync กับ Supabase
              </span>
              <button
                onClick={() => window.location.reload()}
                className="ml-auto rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
              >
                โหลดใหม่
              </button>
            </div>
          </div>
        )}

        {showExpiryWarning && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 sm:px-6">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 text-sm text-amber-800">
              <MaterialIcon name="schedule" className="text-[18px]" />
              <span>เซสชันจะหมดอายุใน {Math.ceil((secondsLeft ?? 0) / 60)} นาที</span>
              <button
                onClick={handleExtendSession}
                className="ml-auto rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                ต่ออายุการใช้งาน
              </button>
            </div>
          </div>
        )}

        <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>

        <footer className="relative border-t border-slate-200/60 bg-white/60 py-6 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 text-center sm:px-6">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="LiftLab Fitness"
                className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
              />
              <span className="text-sm font-semibold text-slate-700">LiftLab Fitness</span>
            </div>
            <p className="text-xs text-slate-400">
              © 2026 LiftLab Fitness — ระบบจัดการฟิตเนสครบวงจร
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
