// src/lib/supabase.js v22-fix
// STUB version — does not import @supabase/supabase-js so the build succeeds.
//
// When you're ready to wire Supabase:
//   1. Run in your terminal:  npm install @supabase/supabase-js
//   2. Add to Vercel env vars:
//        VITE_SUPABASE_URL = https://<your-ref>.supabase.co
//        VITE_SUPABASE_ANON_KEY = <your anon key>
//   3. Replace this file with the commented-out real version below
//
// Until then, `supabase` is null and all consumers handle that gracefully.

export const supabase = null;

/*
// ============= REAL VERSION — paste this in once Supabase is set up =============
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (url && key) ? createClient(url, key) : null;

if (!supabase && typeof window !== "undefined") {
  console.warn("[supabase] Not configured. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.");
}
*/
