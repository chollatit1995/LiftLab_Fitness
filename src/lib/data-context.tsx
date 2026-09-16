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

/** การจองที่ฝั่งเซิร์ฟเวอร์ปฏิเสธเพราะช่วงเวลาถูกจองตัดหน้าไปแล้ว */
export interface RejectedBooking {
  id: string;
  resourceName: string;
  date: string;
  time: string;
  reason: string;
}

interface DataContextValue {
  data: AppData;
  updateData: (updater: (prev: AppData) => AppData) => void;
  resetData: () => void;
  /** ดึงข้อมูลล่าสุดจากฐานข้อมูล แล้วคืนค่าที่ได้ (null = ดึงไม่สำเร็จ) */
  reloadData: () => Promise<AppData | null>;
  hydrated: boolean;
  usingDatabase: boolean;
  rejectedBookings: RejectedBooking[];
  dismissRejectedBookings: () => void;
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

async function saveToApi(
  data: AppData
): Promise<{ ok: boolean; rejectedBookings: RejectedBooking[] }> {
  try {
    const res = await fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) return { ok: false, rejectedBookings: [] };
    const json = await res.json().catch(() => null);
    return {
      ok: true,
      rejectedBookings: (json?.rejectedBookings as RejectedBooking[]) ?? [],
    };
  } catch {
    return { ok: false, rejectedBookings: [] };
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [data, setData] = useState<AppData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [usingDatabase, setUsingDatabase] = useState(false);
  const [rejectedBookings, setRejectedBookings] = useState<RejectedBooking[]>([]);
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
      const { ok, rejectedBookings: rejected } = await saveToApi(next);
      unsavedRef.current = !ok;
      setUsingDatabase(ok);
      if (!ok || rejected.length === 0) return;

      // เซิร์ฟเวอร์ไม่รับการจองบางรายการ — ต้องดึงของจริงมาแสดงแทนที่จะปล่อยให้เห็นรายการที่ไม่มีอยู่
      setRejectedBookings(rejected);
      const fresh = await fetchFromApi();
      if (fresh) {
        setData(fresh);
        saveData(fresh);
      }
    }, 400);
  }, []);

  const dismissRejectedBookings = useCallback(() => setRejectedBookings([]), []);

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

  const reloadData = useCallback(async (): Promise<AppData | null> => {
    if (!shouldFetchStaffDataApi(pathnameRef.current)) return null;
    const apiData = await fetchFromApi();
    if (!apiData) return null;
    setData(apiData);
    saveData(apiData);
    setUsingDatabase(true);
    unsavedRef.current = false;
    return apiData;
  }, []);

  const resetData = useCallback(() => {
    setData(initialData);
    persist(initialData);
  }, [persist]);

  return (
    <DataContext.Provider
      value={{
        data,
        updateData,
        resetData,
        reloadData,
        hydrated,
        usingDatabase,
        rejectedBookings,
        dismissRejectedBookings,
      }}
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
