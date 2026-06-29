// src/components/FeatureRemaining.jsx
// A compact inline "what's left" pill for FREE users on a specific feature screen
// (e.g. "Il te reste 3 scans"). Reads real numbers from usage_status. Renders
// nothing for paid users, for unlimited features, or before data loads. Tapping it
// goes to the paywall. Pass a changing `refreshSignal` to make it re-check (e.g.
// after each action) so it stays live.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function FeatureRemaining({ feature, unit, periodNote = "", refreshSignal = 0, className = "" }) {
  const navigate = useNavigate();
  const [info, setInfo] = useState(null); // "paid" | { remaining, limit } | null

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const accessToken = sess?.session?.access_token;
        if (!accessToken) return;
        const res = await fetch("/api/content?task=usage_status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: "usage_status", accessToken }),
        });
        const json = await res.json();
        if (!alive || !json?.data) return;
        if (json.data.tier !== "free") { setInfo("paid"); return; }
        const f = json.data[feature];
        if (f) setInfo({ remaining: f.remaining, limit: f.limit });
      } catch { /* silent — pill just doesn't show */ }
    })();
    return () => { alive = false; };
  }, [feature, refreshSignal]);

  if (!info || info === "paid" || info.limit === -1) return null;

  if (info.remaining <= 0) {
    return (
      <button onClick={() => navigate("/paywall")}
        className={`inline-flex items-center gap-1 text-[11px] font-black text-rose-500 ${className}`}>
        <Lock size={11} /> Limite atteinte — Débloquer
      </button>
    );
  }

  const low = info.remaining <= Math.max(1, Math.ceil(info.limit * 0.25));
  return (
    <button onClick={() => navigate("/paywall")}
      className={`inline-flex items-center gap-1 text-[11px] font-bold ${low ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"} ${className}`}>
      Il te reste <span className="font-black tabular-nums">{info.remaining}</span> {unit}{periodNote ? ` ${periodNote}` : ""}
    </button>
  );
}
