// src/hooks/useAppConfig.js — v24
// Loads the single app_config row so prices, exam dates, feature flags, and usage
// caps can be changed live from the admin panel without a redeploy. Falls back to
// trackConfig.js / constants defaults when Supabase isn't configured or the row
// isn't loaded yet, so the app always has sane values.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { TRACK_CONFIG } from "../utils/trackConfig";

const DEFAULTS = {
  exam_9af_start: TRACK_CONFIG["9AF"].examStart,
  exam_9af_range: TRACK_CONFIG["9AF"].examRange,
  exam_ns4_start: TRACK_CONFIG.NS4.examStart,
  exam_ns4_range: TRACK_CONFIG.NS4.examRange,
  price_basic: 750,
  price_premium: 1200,
  caps: null,
  flags: { payments_on: true, calls_on: true, new_signups: true },
};

let _cache = null; // module cache so all consumers share one fetch

export function useAppConfig() {
  const [config, setConfig] = useState(_cache || DEFAULTS);
  const [loading, setLoading] = useState(!_cache);

  const load = useCallback(async () => {
    if (!supabase) { setConfig(DEFAULTS); setLoading(false); return; }
    try {
      const { data } = await supabase.from("app_config").select("*").eq("id", 1).single();
      if (data) {
        const merged = {
          ...DEFAULTS,
          ...data,
          exam_9af_start: data.exam_9af_start ? new Date(data.exam_9af_start) : DEFAULTS.exam_9af_start,
          exam_ns4_start: data.exam_ns4_start ? new Date(data.exam_ns4_start) : DEFAULTS.exam_ns4_start,
          flags: { ...DEFAULTS.flags, ...(data.flags || {}) },
        };
        _cache = merged;
        setConfig(merged);
      }
    } catch {
      setConfig(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!_cache) load(); }, [load]);

  const save = useCallback(async (patch) => {
    const next = { ...config, ...patch, flags: { ...config.flags, ...(patch.flags || {}) } };
    setConfig(next);
    _cache = next;
    if (!supabase) return { error: { message: "Supabase non configuré." } };
    const { error } = await supabase.from("app_config").update({
      ...patch,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    return { error };
  }, [config]);

  return { config, loading, reload: load, save };
}
