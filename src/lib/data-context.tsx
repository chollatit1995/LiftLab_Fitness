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
  /**
   * ข้อมูลที่ถืออยู่มาจากฐานข้อมูลจริงในรอบนี้หรือยัง
   * เท็จ = กำลังดูสแนปช็อตเก่าใน localStorage จึงบันทึกกลับไม่ได้
   */
  canSave: boolean;
  rejectedBookings: RejectedBooking[];
  dismissRejectedBookings: () => void;
  /** ข้อความเตือนเมื่อการแก้ไขถูกปฏิเสธเพราะสิทธิ์ไม่พอ */
  permissionNotice: string;
  dismissPermissionNotice: () => void;
  /** ข้อความเตือนเมื่อแก้ไขแล้วบันทึกไม่ได้เพราะยังไม่ได้เชื่อมฐานข้อมูล */
  saveBlockedNotice: string;
  dismissSaveBlockedNotice: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

/**
 * ต้องมากกว่า connect_timeout ของฝั่งฐานข้อมูล (10 วินาที ใน db/client.ts) เสมอ
 * ของเดิมตั้งไว้ 8 วินาที client จึงยอมแพ้ตั้งแต่ server ยังต่อฐานข้อมูลไม่เสร็จด้วยซ้ำ
 * แล้วตกไปใช้ข้อมูลเก่าใน localStorage ทั้งที่ฐานข้อมูลยังดีอยู่
 */
const FETCH_TIMEOUT_MS = 15000;

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

interface SaveOutcome {
  ok: boolean;
  rejectedBookings: RejectedBooking[];
  /** ส่วนของข้อมูลที่ถูกปฏิเสธเพราะสิทธิ์ไม่พอ */
  blockedCollections: string[];
  blockedBookings: number;
}

const EMPTY_OUTCOME: Omit<SaveOutcome, "ok"> = {
  rejectedBookings: [],
  blockedCollections: [],
  blockedBookings: 0,
};

async function saveToApi(data: AppData): Promise<SaveOutcome> {
  try {
    const res = await fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) return { ok: false, ...EMPTY_OUTCOME };
    const json = await res.json().catch(() => null);
    return {
      ok: true,
      rejectedBookings: (json?.rejectedBookings as RejectedBooking[]) ?? [],
      blockedCollections: (json?.blockedCollections as string[]) ?? [],
      blockedBookings: Number(json?.blockedBookings ?? 0),
    };
  } catch {
    return { ok: false, ...EMPTY_OUTCOME };
  }
}

const COLLECTION_LABELS: Record<string, string> = {
  staff: "ข้อมูลพนักงาน",
  classes: "คลาส",
  packages: "แพ็กเกจ",
  promotions: "โปรโมชั่น",
  members: "ข้อมูลสมาชิก",
  bookings: "การจอง",
  facilities: "พื้นที่",
  sales: "ยอดขาย",
  membershipRenewals: "ประวัติต่ออายุ",
};

function permissionNoticeFor(outcome: SaveOutcome): string {
  const parts: string[] = [];
  if (outcome.blockedCollections.length > 0) {
    const names = outcome.blockedCollections
      .map((c) => COLLECTION_LABELS[c] ?? c)
      .join(", ");
    parts.push(`คุณไม่มีสิทธิ์แก้ไข${names}`);
  }
  if (outcome.blockedBookings > 0) {
    parts.push(
      `แก้ไขได้เฉพาะคิวของตัวเอง (${outcome.blockedBookings} รายการถูกปฏิเสธ)`
    );
  }
  if (parts.length === 0) return "";
  return `${parts.join(" · ")} — การเปลี่ยนแปลงถูกยกเลิกแล้ว`;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [data, setData] = useState<AppData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [usingDatabase, setUsingDatabase] = useState(false);
  const [rejectedBookings, setRejectedBookings] = useState<RejectedBooking[]>([]);
  const [permissionNotice, setPermissionNotice] = useState("");
  const [saveBlockedNotice, setSaveBlockedNotice] = useState("");
  const [canSave, setCanSave] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** มีการแก้ไขที่ยังบันทึกลงฐานข้อมูลไม่สำเร็จหรือยัง */
  const unsavedRef = useRef(false);
  /**
   * เคยโหลดจากฐานข้อมูลสำเร็จในรอบนี้แล้วหรือยัง — ต่างจาก usingDatabase ตรงที่
   * ไม่กลับเป็นเท็จเมื่อบันทึกพลาด ข้อมูลยังมีต้นทางจากฐานข้อมูลอยู่ จึงลองบันทึกซ้ำได้
   */
  const loadedFromDbRef = useRef(false);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const loadFromApi = useCallback(async () => {
    const apiData = await fetchFromApi();
    if (!apiData) return false;
    setData(apiData);
    setUsingDatabase(true);
    loadedFromDbRef.current = true;
    setCanSave(true);
    setSaveBlockedNotice("");
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
    const staffPath = shouldFetchStaffDataApi(pathnameRef.current);

    /**
     * ห้ามส่งก้อนที่ไม่ได้มาจากฐานข้อมูลกลับขึ้นไปเด็ดขาด
     *
     * ถ้า GET /api/data พลาด หน้าเว็บจะ fallback ไปใช้สแนปช็อตเก่าใน localStorage
     * ซึ่งอาจเก่าเป็นวัน พอ PUT กลับ saveAppData จะลบทุกแถวที่เกิดขึ้นหลังสแนปช็อตนั้นทิ้ง
     * — สมาชิกที่ถูกเพิ่มระหว่างนั้นหายทั้งหมด ยืนยันแล้วว่าเคยเกิดจริง 6 ราย
     *
     * merge ช่วยไม่ได้เพราะการแก้ของผู้ใช้อ้างอิงกับก้อนเก่าทั้งก้อน
     * ยอมไม่บันทึกแล้วบอกให้โหลดใหม่ ดีกว่าลบข้อมูลของคนอื่น
     *
     * ไม่เขียนลง localStorage ด้วย — ถ้าเขียน รอบหน้าที่เปิดมาแล้ว API ล่มอีก
     * จะหยิบก้อนที่มีการแก้ค้างอยู่นี้มาแสดงราวกับว่าบันทึกสำเร็จไปแล้ว
     * และไม่แตะ unsavedRef เพื่อให้ effect ด้านบนยังลองโหลดใหม่เองได้เมื่อเปลี่ยนหน้า
     */
    if (staffPath && !loadedFromDbRef.current) {
      setSaveBlockedNotice(
        "ยังโหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ การแก้ไขนี้จึงยังไม่ถูกบันทึก — กดโหลดใหม่ แล้วทำรายการอีกครั้ง"
      );
      return;
    }

    saveData(next);
    // หน้า portal/login ไม่ควรเขียนทับฐานข้อมูลผ่าน /api/data ของพนักงาน
    if (!staffPath) {
      unsavedRef.current = false;
      setUsingDatabase(false);
      return;
    }

    unsavedRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const outcome = await saveToApi(next);
      unsavedRef.current = !outcome.ok;
      setUsingDatabase(outcome.ok);
      if (!outcome.ok) return;

      const notice = permissionNoticeFor(outcome);
      if (notice) setPermissionNotice(notice);
      if (outcome.rejectedBookings.length > 0) {
        setRejectedBookings(outcome.rejectedBookings);
      }
      if (!notice && outcome.rejectedBookings.length === 0) return;

      // เซิร์ฟเวอร์ไม่รับบางส่วน — ต้องดึงของจริงมาแสดง ไม่งั้นหน้าจอจะโชว์สิ่งที่ไม่ได้ถูกบันทึก
      const fresh = await fetchFromApi();
      if (fresh) {
        setData(fresh);
        saveData(fresh);
      }
    }, 400);
  }, []);

  const dismissRejectedBookings = useCallback(() => setRejectedBookings([]), []);
  const dismissPermissionNotice = useCallback(() => setPermissionNotice(""), []);
  const dismissSaveBlockedNotice = useCallback(() => setSaveBlockedNotice(""), []);

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
    loadedFromDbRef.current = true;
    setCanSave(true);
    setSaveBlockedNotice("");
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
        canSave,
        rejectedBookings,
        dismissRejectedBookings,
        permissionNotice,
        dismissPermissionNotice,
        saveBlockedNotice,
        dismissSaveBlockedNotice,
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
