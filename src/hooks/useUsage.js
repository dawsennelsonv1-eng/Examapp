// src/hooks/useUsage.js
// Client-side daily usage tracking + cap enforcement.
// Server-side enforcement comes in Tier 3B (Supabase). For now localStorage.

import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS, USAGE_CAPS } from "../utils/constants";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadUsage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USAGE_TODAY);
    if (!raw) return { date: todayKey(), counts: {} };
    const parsed = JSON.parse(raw);
    // reset if new day
    if (parsed.date !== todayKey()) return { date: todayKey(), counts: {} };
    return parsed;
  } catch {
    return { date: todayKey(), counts: {} };
  }
}

export function useUsage() {
  const [usage, setUsage] = useState(() => loadUsage());
  const [planTier, setPlanTier] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.PLAN_TIER) || "free";
    } catch {
      return "free";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USAGE_TODAY, JSON.stringify(usage));
    } catch {}
  }, [usage]);

  const caps = USAGE_CAPS[planTier] || USAGE_CAPS.free;

  const canUse = useCallback(
    (feature) => {
      const cap = caps[feature];
      if (cap === -1) return true; // unlimited
      if (cap === undefined) return true;
      const used = usage.counts[feature] || 0;
      return used < cap;
    },
    [caps, usage]
  );

  const getRemaining = useCallback(
    (feature) => {
      const cap = caps[feature];
      if (cap === -1) return Infinity;
      const used = usage.counts[feature] || 0;
      return Math.max(0, cap - used);
    },
    [caps, usage]
  );

  const increment = useCallback((feature) => {
    setUsage((u) => ({
      ...u,
      counts: { ...u.counts, [feature]: (u.counts[feature] || 0) + 1 },
    }));
  }, []);

  const upgradePlan = useCallback((newTier) => {
    setPlanTier(newTier);
    try {
      localStorage.setItem(STORAGE_KEYS.PLAN_TIER, newTier);
    } catch {}
  }, []);

  return {
    planTier,
    upgradePlan,
    canUse,
    getRemaining,
    increment,
    caps,
    usage: usage.counts,
  };
}
