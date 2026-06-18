// src/hooks/useAdminAccess.js — v24 (fixed)
// Admin gate. Reads profiles.statut from Supabase AND honors a local override.
// Fixes "I set myself admin but no button" by RE-CHECKING on auth state changes.
//
// Instant local override (offline / emergency): localStorage.setItem("laureat.admin","1")

import { useEffect, useState, useCallback } from "react";
import { useUsage } from "./useUsage";
import { useApp } from "../contexts/AppContext";

const VIEW_AS_KEY = "laureat.viewAsPlan";
const VIEW_AS_TRACK_KEY = "laureat.viewAsTrack";
const LOCAL_ADMIN_KEY = "laureat.admin";

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
  const [viewAsTrack, setViewAsTrackState] = useState(() => {
    try { return sessionStorage.getItem(VIEW_AS_TRACK_KEY) || null; } catch { return null; }
  });

  const checkAdmin = useCallback(async () => {
    try {
      if (localStorage.getItem(LOCAL_ADMIN_KEY) === "1") {
        setIsAdmin(true); setLoading(false); return;
      }
    } catch {}

    const supabase = await getSupabaseClient();
    if (!supabase) { setIsAdmin(false); setLoading(false); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); setUserId(null); setLoading(false); return; }
      setUserId(user.id);
      const { data, error } = await supabase
        .from("profiles").select("statut").eq("id", user.id).single();
      setIsAdmin(!error && data?.statut === "admin");
    } catch (err) {
      console.warn("Admin check exception:", err?.message);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let sub;
    (async () => {
      await checkAdmin();
      const supabase = await getSupabaseClient();
      if (supabase && !cancelled) {
        sub = supabase.auth.onAuthStateChange(() => { checkAdmin(); });
      }
    })();
    return () => { cancelled = true; sub?.data?.subscription?.unsubscribe?.(); };
  }, [checkAdmin]);

  const setViewAsPlan = useCallback((plan) => {
    setViewAsPlanState(plan);
    try {
      if (plan) sessionStorage.setItem(VIEW_AS_KEY, plan);
      else sessionStorage.removeItem(VIEW_AS_KEY);
    } catch {}
  }, []);

  const setViewAsTrack = useCallback((track) => {
    setViewAsTrackState(track);
    try {
      if (track) sessionStorage.setItem(VIEW_AS_TRACK_KEY, track);
      else sessionStorage.removeItem(VIEW_AS_TRACK_KEY);
    } catch {}
  }, []);

  return { isAdmin, loading, userId, viewAsPlan, setViewAsPlan, viewAsTrack, setViewAsTrack };
}

export function useEffectivePlan() {
  const { planTier } = useUsage();
  const { isAdmin, viewAsPlan } = useAdminAccess();
  if (isAdmin && viewAsPlan) return viewAsPlan;
  return planTier;
}

export function useEffectiveTrack() {
  const { track } = useApp();
  const { isAdmin, viewAsTrack } = useAdminAccess();
  if (isAdmin && viewAsTrack) return viewAsTrack;
  return track;
}
