// src/hooks/useUsage.js
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
    if (parsed.date !== todayKey()) return { date: todayKey(), counts: {} };
    return parsed;
  } catch {
    return { date: todayKey(), counts: {} };
  }
}

const VALID_TIERS = ["free", "basic", "premium"];

export function useUsage() {
  const [usage, setUsage] = useState(() => loadUsage());
  const [planTier, setPlanTier] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PLAN_TIER);
      // Guard: only accept a known tier string. Anything else (an object that
      // leaked in, stale JSON, null) falls back to "free" — this repairs users
      // whose stored value got corrupted.
      return VALID_TIERS.includes(raw) ? raw : "free";
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
      if (cap === -1 || cap === undefined) return true;
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
    const tier = VALID_TIERS.includes(newTier) ? newTier : "free";
    setPlanTier(tier);
    try {
      localStorage.setItem(STORAGE_KEYS.PLAN_TIER, tier);
    } catch {}
  }, []);

  return { planTier, upgradePlan, canUse, getRemaining, increment, caps, usage: usage.counts };
}
