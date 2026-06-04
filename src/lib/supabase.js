// src/lib/supabase.js — v24
// Real client. Reads config from Vite env vars (set these in Vercel):
//   VITE_SUPABASE_URL       = https://<your-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY  = <your anon / publishable key>   (NEVER the service_role key)
//
// The anon key is safe in client code — it's protected by Row Level Security.
// If Supabase isn't configured, `supabase` is null and every consumer degrades
// gracefully to localStorage-only behavior (the app still works offline / pre-auth).

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // needed for magic-link redirects
      },
    })
  : null;

export const isSupabaseConfigured = Boolean(supabase);

if (!supabase && typeof window !== "undefined") {
  console.warn("[supabase] Not configured — running in local-only mode. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in Vercel.");
}
