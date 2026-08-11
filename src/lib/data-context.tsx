"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { AppData } from "./types";
import { initialData, loadData, saveData, withDefaults } from "./store";

interface DataContextValue {
  data: AppData;
  updateData: (updater: (prev: AppData) => AppData) => void;
  resetData: () => void;
  reloadData: () => Promise<void>;
  hydrated: boolean;
  usingDatabase: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

const FETCH_TIMEOUT_MS = 8000;

/**
 * /api/data ต้องมี session พนักงาน — ห้ามเรียกตอนอยู่หน้า login หรือ portal ของสมาชิก
 * ไม่งั้น middleware จะตอบ 401 ทั้งที่สมาชิก login ถูกต้องแล้ว
 */
function shouldFetchStaffDataApi(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/login") return false;
  if (pathname.startsWith("/portal")) return false;
  return true;
}

async function fetchFromApi(): Promise<AppData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch("/api/data", { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.error) return null;
    return withDefaults(json as AppData);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function saveToApi(data: AppData): Promise<boolean> {
  try {
    const res = await fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [data, setData] = useState<AppData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [usingDatabase, setUsingDatabase] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** มีการแก้ไขที่ยังบันทึกลงฐานข้อมูลไม่สำเร็จหรือยัง */
  const unsavedRef = useRef(false);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const loadFromApi = useCallback(async () => {
    const apiData = await fetchFromApi();
    if (!apiData) return false;
    setData(apiData);
    setUsingDatabase(true);
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!shouldFetchStaffDataApi(pathnameRef.current)) {
        if (!cancelled) {
          setData(loadData());
          setUsingDatabase(false);
          setHydrated(true);
        }
        return;
      }

      const ok = await loadFromApi();
      if (cancelled) return;
      if (!ok) setData(loadData());
      setHydrated(true);
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, [loadFromApi]);

  /**
   * รอบแรกมักเกิดที่หน้า login/portal ซึ่งยังไม่มี session พนักงาน
   * จึงต้องลองใหม่เมื่อเข้าหน้าหลังบ้านหลัง login แล้ว
   * แต่ถ้ามีของที่ยังบันทึกไม่สำเร็จ ห้ามดึงมาทับ
   */
  useEffect(() => {
    if (!hydrated || usingDatabase || unsavedRef.current) return;
    if (!shouldFetchStaffDataApi(pathname)) return;
    loadFromApi();
  }, [pathname, hydrated, usingDatabase, loadFromApi]);

  const persist = useCallback((next: AppData) => {
    saveData(next);
    // หน้า portal/login ไม่ควรเขียนทับฐานข้อมูลผ่าน /api/data ของพนักงาน
    if (!shouldFetchStaffDataApi(pathnameRef.current)) {
      unsavedRef.current = false;
      setUsingDatabase(false);
      return;
    }
    unsavedRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const saved = await saveToApi(next);
      unsavedRef.current = !saved;
      setUsingDatabase(saved);
    }, 400);
  }, []);

  const updateData = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const reloadData = useCallback(async () => {
    if (!shouldFetchStaffDataApi(pathnameRef.current)) return;
    const apiData = await fetchFromApi();
    if (apiData) {
      setData(apiData);
      saveData(apiData);
      setUsingDatabase(true);
      unsavedRef.current = false;
    }
  }, []);

  const resetData = useCallback(() => {
    setData(initialData);
    persist(initialData);
  }, [persist]);

  return (
    <DataContext.Provider
      value={{ data, updateData, resetData, reloadData, hydrated, usingDatabase }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
