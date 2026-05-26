// src/hooks/useAuth.js
// Auth hook with Supabase. Tracks user, role (user/admin), session.

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export function useAuth() {
  const supabase = getSupabase();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error && error.code === "PGRST116") {
        // No profile yet — create one
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert({ id: userId, role: "user", plan: "free" })
          .select()
          .single();
        setProfile(newProfile);
      } else if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.warn("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message };
  };

  const signInWithPassword = async (email, password) => {
    if (!supabase) return { error: "Auth not configured" };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data?.user, error: error?.message };
  };

  const signUp = async (email, password) => {
    if (!supabase) return { error: "Auth not configured" };
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { user: data?.user, error: error?.message };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return {
    user,
    profile,
    isAuthed: Boolean(user),
    isAdmin: profile?.role === "admin",
    isPaid: profile?.plan === "basic" || profile?.plan === "premium",
    loading,
    isConfigured: isSupabaseConfigured(),
    signInWithEmail,
    signInWithPassword,
    signUp,
    signOut,
  };
}
