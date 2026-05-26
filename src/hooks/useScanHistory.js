// src/hooks/useScanHistory.js
// Stores recent scans for quick re-access from home.

import { useCallback, useEffect, useState } from "react";

const KEY = "laureat.scanHistory";
const MAX_ITEMS = 20;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function useScanHistory() {
  const [history, setHistory] = useState(() => load());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setHistory(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((list) => {
    try {
      const trimmed = list.slice(0, MAX_ITEMS);
      localStorage.setItem(KEY, JSON.stringify(trimmed));
      setHistory(trimmed);
    } catch {}
  }, []);

  const addScan = useCallback((scan) => {
    const entry = {
      id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      enonce: scan.enonce?.substring(0, 200) || "",
      donnees: scan.donnees || [],
      sections: scan.sections || [],
      capturedImage: scan.capturedImage || null,
      subject: scan.subject || "Physique",
      timestamp: Date.now(),
    };
    const current = load();
    persist([entry, ...current]);
    return entry;
  }, [persist]);

  const removeScan = useCallback((id) => {
    const current = load();
    persist(current.filter((s) => s.id !== id));
  }, [persist]);

  const getScan = useCallback((id) => load().find((s) => s.id === id), []);

  const clearAll = useCallback(() => persist([]), [persist]);

  return { history, addScan, removeScan, getScan, clearAll };
}
