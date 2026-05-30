// src/hooks/useAdminAccess.js v22
// Single source of truth for admin gating + "view as" plan preview.
//
// HOW IT WORKS:
//  - On mount, queries Supabase: SELECT statut FROM profiles WHERE id = auth.uid()
//  - Exposes { isAdmin, viewAsPlan, setViewAsPlan }
//  - The header's plan-switcher dropdown writes to viewAsPlan
//  - Any page that wants plan-dependent UI reads the effective plan via useEffectivePlan()
//
// FALLBACK FOR DEV: if Supabase isn't configured, allow admin via a local flag
// `localStorage.setItem("laureat.admin", "1")` so you can test the dashboard.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useUsage } from "./useUsage";

const VIEW_AS_KEY = "laureat.viewAsPlan";

export function useAdminAccess() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [viewAsPlan, setViewAsPlanState] = useState(() => {
    try { return sessionStorage.getItem(VIEW_AS_KEY) || null; } catch { return null; }
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Dev fallback
      try {
        if (localStorage.getItem("laureat.admin") === "1") {
          if (!cancelled) { setIsAdmin(true); setLoading(false); }
          return;
        }
      } catch {}

      if (!supabase) {
        if (!cancelled) { setIsAdmin(false); setLoading(false); }
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) { setIsAdmin(false); setLoading(false); return; }
        setUserId(user.id);

        const { data, error } = await supabase
          .from("profiles")
          .select("statut")
          .eq("id", user.id)
          .single();

        if (cancelled) return;
        if (error) { console.warn("Admin check failed:", error.message); setIsAdmin(false); }
        else setIsAdmin(data?.statut === "admin");
      } catch (err) {
        console.warn("Admin check exception:", err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const setViewAsPlan = useCallback((plan) => {
    setViewAsPlanState(plan);
    try {
      if (plan) sessionStorage.setItem(VIEW_AS_KEY, plan);
      else sessionStorage.removeItem(VIEW_AS_KEY);
    } catch {}
  }, []);

  return { isAdmin, loading, userId, viewAsPlan, setViewAsPlan };
}

// Returns the plan the user should see — viewAs override if admin is previewing, else real plan
export function useEffectivePlan() {
  const { planTier } = useUsage();
  const { isAdmin, viewAsPlan } = useAdminAccess();
  if (isAdmin && viewAsPlan) return viewAsPlan;
  return planTier;
}
