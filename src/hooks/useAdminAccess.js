// src/hooks/useAdminAccess.js v22-fix
// Admin gate that works WITHOUT Supabase. When Supabase is set up later, the
// import will resolve and Supabase check kicks in automatically.
//
// HOW TO BECOME ADMIN RIGHT NOW (no Supabase needed):
//   1. Open the app in your browser
//   2. Open DevTools console (long-press refresh on mobile Chrome → "Open DevTools")
//   3. Run: localStorage.setItem("laureat.admin", "1")
//   4. Refresh the page
//   5. The amber "Admin" badge appears in the top-right
//
// To stop being admin (test as a normal user):
//   localStorage.removeItem("laureat.admin")
//
// When you set up Supabase later, this file already supports it — once you
// install @supabase/supabase-js and create src/lib/supabase.js, the Supabase
// check runs alongside the localStorage check.

import { useEffect, useState, useCallback } from "react";
import { useUsage } from "./useUsage";

const VIEW_AS_KEY = "laureat.viewAsPlan";
const LOCAL_ADMIN_KEY = "laureat.admin";

// Lazy-load Supabase only if it exists. Won't break the build if missing.
async function getSupabaseClient() {
  try {
    const mod = await import("../lib/supabase");
    return mod?.supabase || null;
  } catch {
    return null;
  }
}

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
      // 1. Local override always wins (lets you test admin features offline)
      try {
        if (localStorage.getItem(LOCAL_ADMIN_KEY) === "1") {
          if (!cancelled) { setIsAdmin(true); setLoading(false); }
          return;
        }
      } catch {}

      // 2. Try Supabase — but only if installed
      const supabase = await getSupabaseClient();
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

// Returns the plan the user should see — admin's viewAs preview if set, else real plan
export function useEffectivePlan() {
  const { planTier } = useUsage();
  const { isAdmin, viewAsPlan } = useAdminAccess();
  if (isAdmin && viewAsPlan) return viewAsPlan;
  return planTier;
}
