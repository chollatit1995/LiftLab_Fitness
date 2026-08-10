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
  const [data, setData] = useState<AppData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [usingDatabase, setUsingDatabase] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchFromApi()
      .then((apiData) => {
        if (apiData) {
          setData(apiData);
          setUsingDatabase(true);
        } else {
          setData(loadData());
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const persist = useCallback((next: AppData) => {
    saveData(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const saved = await saveToApi(next);
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
