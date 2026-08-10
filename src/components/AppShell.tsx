"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { isValidRole, navItemsForRole, roleLabels } from "@/lib/permissions";

interface User {
  email: string;
  name: string;
  role: string;
}

const BARE_LAYOUT_PATHS = ["/login", "/change-password"];

/** portal ของสมาชิกมี layout ของตัวเอง ไม่ใช้ sidebar หลังบ้าน */
const BARE_LAYOUT_PREFIXES = ["/portal"];

/** เตือนผู้ใช้ก่อน session หมดอายุ (วินาที) */
const EXPIRY_WARNING_SECONDS = 5 * 60;

function MaterialIcon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined text-[20px] leading-none">
      {name}
    </span>
  );
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isBareLayout =
    BARE_LAYOUT_PATHS.includes(pathname) ||
    BARE_LAYOUT_PREFIXES.some((p) => pathname.startsWith(p));

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
      setExpiresAt(data.expiresAt ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (isBareLayout) return;
    loadSession();
  }, [isBareLayout, pathname, loadSession]);

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
    if (!expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const remaining = expiresAt - Math.floor(Date.now() / 1000);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        router.push("/login");
        router.refresh();
      }
    };
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [expiresAt, router]);

  const navItems = useMemo(
    () => (user ? navItemsForRole(user.role) : []),
    [user]
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleExtendSession = async () => {
    // middleware จะออก cookie ใหม่ให้เองเมื่อมี request เข้ามาตอนใกล้หมดอายุ
    router.refresh();
    await loadSession();
  };

  if (isBareLayout) {
    return <>{children}</>;
  }

  const showExpiryWarning =
    secondsLeft !== null &&
    secondsLeft > 0 &&
    secondsLeft <= EXPIRY_WARNING_SECONDS;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200/80 px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
            <MaterialIcon name="fitness_center" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900">
              LiftLab Fitness
            </p>
            <p className="truncate text-xs text-slate-500">
              ระบบบริหารจัดการฟิตเนส
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          เมนูหลัก
        </p>
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className={active ? "text-brand-600" : "text-slate-400"}>
                <MaterialIcon name={item.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.labelTh}</span>
                <span className="block truncate text-[10px] font-normal text-slate-400">
                  {item.labelEn}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/80 p-4">
        {user && (
          <Link
            href="/profile"
            className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
              pathname.startsWith("/profile")
                ? "bg-brand-50"
                : "bg-slate-50 hover:bg-slate-100"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {isValidRole(user.role) ? roleLabels[user.role].th : user.role}
              </p>
            </div>
            <span className="text-slate-300">
              <MaterialIcon name="chevron_right" />
            </span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-red-600"
        >
          <MaterialIcon name="logout" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        rel="stylesheet"
      />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200/80 bg-white lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="ปิดเมนู"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-white shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="ปิด"
              >
                <MaterialIcon name="close" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md lg:hidden">
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
              LiftLab Fitness
            </p>
          </div>
          {user && (
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
            >
              {user.name.charAt(0)}
            </Link>
          )}
        </header>

        {showExpiryWarning && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 sm:px-6">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 text-sm text-amber-800">
              <span className="material-symbols-outlined text-[18px]">
                schedule
              </span>
              <span>
                เซสชันจะหมดอายุใน {Math.ceil((secondsLeft ?? 0) / 60)} นาที
              </span>
              <button
                onClick={handleExtendSession}
                className="ml-auto rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                ต่ออายุการใช้งาน
              </button>
            </div>
          </div>
        )}

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-6">
          <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-500 sm:px-6">
            © 2026 LiftLab Fitness — ระบบจัดการฟิตเนสครบวงจร
          </div>
        </footer>
      </div>
    </div>
  );
}
