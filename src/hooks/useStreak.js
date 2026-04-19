// src/hooks/useStreak.js
// Tracks consecutive days of app usage. Resets if >1 day gap.

import { useEffect, useState } from "react";

const STREAK_KEY = "laureat.streak";
const LAST_VISIT_KEY = "laureat.lastVisit";

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function useStreak() {
  const [streak, setStreak] = useState(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);
  });

  useEffect(() => {
    try {
      const today = getToday();
      const yesterday = getYesterday();
      const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
      const currentStreak = parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);

      if (lastVisit === today) {
        // already counted today
        return;
      }

      let newStreak;
      if (!lastVisit) {
        newStreak = 1;
      } else if (lastVisit === yesterday) {
        newStreak = currentStreak + 1;
      } else {
        // missed a day — reset
        newStreak = 1;
      }

      localStorage.setItem(STREAK_KEY, String(newStreak));
      localStorage.setItem(LAST_VISIT_KEY, today);
      setStreak(newStreak);
    } catch {}
  }, []);

  return streak;
}
