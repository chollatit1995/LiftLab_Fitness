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
  hydrated: boolean;
  usingDatabase: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

const FETCH_TIMEOUT_MS = 8000;

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

  const loadFromApi = useCallback(async () => {
    const apiData = await fetchFromApi();
    if (!apiData) return false;
    setData(apiData);
    setUsingDatabase(true);
    return true;
  }, []);

  useEffect(() => {
    loadFromApi()
      .then((ok) => {
        if (!ok) setData(loadData());
      })
      .finally(() => setHydrated(true));
  }, [loadFromApi]);

  /**
   * รอบแรกมักเกิดที่หน้า login ซึ่งยังไม่มี session ทำให้ /api/data ตอบ 401
   * จึงต้องลองใหม่เมื่อเปลี่ยนหน้า ไม่งั้นจะใช้ข้อมูลในเบราว์เซอร์ไปทั้ง session
   * แล้วเขียนทับฐานข้อมูลตอนบันทึก แต่ถ้ามีของที่ยังบันทึกไม่สำเร็จ ห้ามดึงมาทับ
   */
  useEffect(() => {
    if (!hydrated || usingDatabase || unsavedRef.current) return;
    loadFromApi();
  }, [pathname, hydrated, usingDatabase, loadFromApi]);

  const persist = useCallback((next: AppData) => {
    saveData(next);
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

  const resetData = useCallback(() => {
    setData(initialData);
    persist(initialData);
  }, [persist]);

  return (
    <DataContext.Provider
      value={{ data, updateData, resetData, hydrated, usingDatabase }}
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
