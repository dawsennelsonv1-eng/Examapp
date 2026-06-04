// api/_supabaseAdmin.js — SERVER ONLY. Never imported by frontend code.
// Uses the SERVICE ROLE key, which bypasses Row Level Security. This is the ONLY
// safe place for it: inside a serverless function, never in the browser bundle.
//
// Vercel env vars required:
//   SUPABASE_URL                = https://<ref>.supabase.co   (no VITE_ prefix)
//   SUPABASE_SERVICE_ROLE_KEY   = <service_role secret>       (KEEP SECRET)

import { createClient } from "@supabase/supabase-js";

let _admin = null;

export function getSupabaseAdmin() {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}
