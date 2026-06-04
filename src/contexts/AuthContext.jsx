// src/contexts/AuthContext.jsx — v24
// Wraps Supabase auth + the user's profile row. Degrades gracefully:
// if Supabase isn't configured, the app runs in "local mode" (no account, the
// old localStorage onboarding flow still works) so nothing hard-breaks.

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { setAnalyticsContext, startAnalyticsSession, logEvent } from "../services/analytics";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load session on mount + subscribe to changes
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    let sub;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session || null);
      if (data?.session?.user) await loadProfile(data.session.user);
      setLoading(false);
      sub = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s || null);
        if (s?.user) loadProfile(s.user);
        else setProfile(null);
      });
    })();
    return () => { sub?.data?.subscription?.unsubscribe?.(); };
  }, []);

  const loadProfile = useCallback(async (user) => {
    if (!isSupabaseConfigured || !user) return;
    try {
      let { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      // Create the profile row on first login if it doesn't exist yet.
      if (!prof) {
        const referralCode = `L${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const { data: created } = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || null,
          referral_code: referralCode,
          last_active_at: new Date().toISOString(),
        }).select().single();
        prof = created;
      } else {
        supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", user.id);
      }
      setProfile(prof);

      // One-time migration: if the profile has no track yet but the device has
      // local onboarding data, push it up so it follows the user across devices.
      try {
        if (prof && !prof.track) {
          const localTrack = localStorage.getItem("laureat.track");
          const localPrefs = JSON.parse(localStorage.getItem("laureat.preferences") || "null");
          const patch = {};
          if (localTrack) patch.track = localTrack;
          if (localPrefs?.personality) patch.personality = localPrefs.personality;
          if (localPrefs?.language) patch.language = localPrefs.language;
          if (Object.keys(patch).length) {
            await supabase.from("profiles").update(patch).eq("id", user.id);
            setProfile((p) => ({ ...(p || {}), ...patch }));
          }
        }
      } catch (e) { console.warn("[auth] local->profile migration skipped:", e?.message); }

      setAnalyticsContext({ userId: user.id, track: prof?.track || null, planTier: prof?.plan_tier || "free" });
      startAnalyticsSession();
      logEvent("app_open", {});
    } catch (err) {
      console.warn("[auth] loadProfile failed:", err?.message);
    }
  }, []);

  const signUp = useCallback(async ({ email, password, name }) => {
    if (!isSupabaseConfigured) return { error: { message: "Auth non configuré." } };
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { name } },
    });
    if (!error) logEvent("signup", { method: "password" });
    return { data, error };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    if (!isSupabaseConfigured) return { error: { message: "Auth non configuré." } };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) logEvent("login", { method: "password" });
    return { data, error };
  }, []);

  const signInWithMagicLink = useCallback(async (email) => {
    if (!isSupabaseConfigured) return { error: { message: "Auth non configuré." } };
    const { data, error } = await supabase.auth.signInWithOtp({ email });
    return { data, error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) return { error: { message: "Auth non configuré." } };
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,   // back to the app after Google
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  // Persist profile changes (track, persona, plan, etc.)
  const updateProfile = useCallback(async (patch) => {
    setProfile((p) => ({ ...(p || {}), ...patch }));
    if (!isSupabaseConfigured || !session?.user) return;
    try {
      await supabase.from("profiles").update(patch).eq("id", session.user.id);
      if (patch.track || patch.plan_tier) {
        setAnalyticsContext({ track: patch.track, planTier: patch.plan_tier });
      }
    } catch (err) {
      console.warn("[auth] updateProfile failed:", err?.message);
    }
  }, [session]);

  const value = useMemo(() => ({
    isConfigured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user || null,
    profile,
    isAuthenticated: Boolean(session?.user),
    signUp, signIn, signInWithMagicLink, signInWithGoogle, signOut, updateProfile,
  }), [loading, session, profile, signUp, signIn, signInWithMagicLink, signInWithGoogle, signOut, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
