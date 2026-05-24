// src/hooks/useStreak.js
// Tracks daily login streak in localStorage.

import { useEffect, useState } from "react";

const STREAK_KEY = "laureat.streak";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [lastVisit, setLastVisit] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      if (!raw) {
        const fresh = { count: 1, lastDate: todayKey() };
        localStorage.setItem(STREAK_KEY, JSON.stringify(fresh));
        setStreak(1);
        setLastVisit(todayKey());
        return;
      }
      const parsed = JSON.parse(raw);
      const today = todayKey();
      const yesterday = yesterdayKey();

      if (parsed.lastDate === today) {
        setStreak(parsed.count);
        setLastVisit(parsed.lastDate);
      } else if (parsed.lastDate === yesterday) {
        const newCount = parsed.count + 1;
        const updated = { count: newCount, lastDate: today };
        localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
        setStreak(newCount);
        setLastVisit(today);
      } else {
        const reset = { count: 1, lastDate: today };
        localStorage.setItem(STREAK_KEY, JSON.stringify(reset));
        setStreak(1);
        setLastVisit(today);
      }
    } catch {
      setStreak(1);
    }
  }, []);

  return { streak, lastVisit };
}
