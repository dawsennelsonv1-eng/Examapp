// src/hooks/useAppConfig.js
// Single-row, client-side app settings: exam dates, prices, WhatsApp group links,
// banner, and feature flags.
//
// WHY THIS WAS REWRITTEN:
// The old version saved each setting to its own table column. PostgREST silently
// DROPS any key that has no matching column, so fields without a dedicated column
// (group_9af, group_ns4, banner) vanished on reload while prices/dates survived.
//
// THE FIX: store the whole config object in ONE jsonb column named `data`. Now any
// field — present or future — persists. Existing values stored in old typed columns
// are still read and preserved (merged under the blob), so nothing is lost.
//
// ONE-TIME SQL (run before deploying this):
//   alter table public.app_config
//     add column if not exists data jsonb not null default '{}'::jsonb;

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

// Sane defaults so the app always has values, even before anything is saved.
const DEFAULTS = {
  exam_9af_start: null,
  exam_9af_range: "",
  exam_ns4_start: null,
  exam_ns4_range: "",
  price_basic: 450,
  price_premium: 900,
  group_9af: "",
  group_ns4: "",
  banner: null,
  flags: {},
};

function dropNulls(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

export function useAppConfig() {
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const rowIdRef = useRef(null); // actual PK value of the single config row

  const load = useCallback(async () => {
    try {
      const { data: row, error } = await supabase
        .from("app_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      if (row) {
        rowIdRef.current = row.id ?? null;
        // eslint-disable-next-line no-unused-vars
        const { id: _id, data: blob, ...legacyCols } = row;
        // Merge order (later wins): defaults < legacy typed columns < json blob.
        // This preserves anything already saved in old columns, while the blob is
        // the source of truth going forward.
        setConfig({ ...DEFAULTS, ...dropNulls(legacyCols), ...(blob || {}) });
      } else {
        setConfig(DEFAULTS);
      }
    } catch (e) {
      console.error("useAppConfig load failed:", e?.message || e);
      setConfig(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Merge a patch into the current config and persist the WHOLE thing into `data`.
  const save = useCallback(async (patch) => {
    const next = { ...config, ...(patch || {}) };
    try {
      let error;
      if (rowIdRef.current != null) {
        ({ error } = await supabase
          .from("app_config")
          .update({ data: next })
          .eq("id", rowIdRef.current));
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("app_config")
          .insert({ data: next })
          .select("id")
          .maybeSingle();
        error = insErr;
        if (inserted) rowIdRef.current = inserted.id ?? null;
      }
      if (!error) setConfig(next); // reflect immediately in the UI
      return { error };
    } catch (error) {
      console.error("useAppConfig save failed:", error?.message || error);
      return { error };
    }
  }, [config]);

  return { config, loading, save, reload: load };
}

export default useAppConfig;
