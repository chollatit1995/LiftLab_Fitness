"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, ThemeMode } from "@/lib/theme";

const modes: { key: ThemeMode; icon: string; label: string }[] = [
  { key: "light", icon: "light_mode", label: "โหมดสว่าง" },
  { key: "dark", icon: "dark_mode", label: "โหมดมืด" },
  { key: "system", icon: "desktop_windows", label: "ตามระบบ (Windows)" },
];

function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    // localStorage ใช้ไม่ได้ (เช่นโหมดส่วนตัวบางเบราว์เซอร์) — ใช้ค่าเริ่มต้น
  }
  return "system";
}

function applyMode(mode: ThemeMode) {
  const dark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** ปุ่มเลือกธีม — compact = ปุ่มเดียวกดวนสำหรับมือถือ */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(readMode());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyMode(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // เก็บไม่ได้ก็ยังใช้ได้ในหน้านี้
    }
    if (mode !== "system") return;
    // ตามระบบ — ถ้าผู้ใช้สลับธีม Windows ระหว่างเปิดหน้าอยู่ ให้เปลี่ยนตามทันที
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyMode("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode, mounted]);

  if (compact) {
    const current = modes.find((m) => m.key === mode) ?? modes[2];
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    return (
      <button
        type="button"
        onClick={() => setMode(next.key)}
        title={`${current.label} — แตะเพื่อเปลี่ยนเป็น${next.label}`}
        aria-label={`ธีม: ${current.label}`}
        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
      >
        <span className="material-symbols-outlined text-[20px] leading-none">
          {current.icon}
        </span>
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="ธีม"
      className="flex items-center gap-0.5 rounded-xl border border-slate-200/80 bg-white p-0.5"
    >
      {modes.map((m) => {
        const active = mounted && mode === m.key;
        return (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={m.label}
            title={m.label}
            onClick={() => setMode(m.key)}
            className={`flex h-7 w-8 items-center justify-center rounded-lg transition ${
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-[18px] leading-none">
              {m.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}
