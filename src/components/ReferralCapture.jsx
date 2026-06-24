// src/components/ReferralCapture.jsx
// 1) Captures ?ref=<userId> from the URL into localStorage (first touch wins).
// 2) Once the visitor is signed in, records who referred them (one time).
// Mount once near the app root. Pure side-effect; renders nothing.

import { useEffect } from "react";
import { supabase } from "../lib/supabase";

const REF_KEY = "laureat.refCode";
const DONE_KEY = "laureat.refAttributed";

export default function ReferralCapture() {
  useEffect(() => {
    // Capture ?ref= on any load.
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && !localStorage.getItem(DONE_KEY) && !localStorage.getItem(REF_KEY)) {
        localStorage.setItem(REF_KEY, ref);
      }
    } catch {}

    let alive = true;
    const attribute = async () => {
      try {
        if (localStorage.getItem(DONE_KEY)) return;
        const ref = localStorage.getItem(REF_KEY);
        if (!ref) return;
        const { data: s } = await supabase.auth.getSession();
        const token = s?.session?.access_token;
        if (!token) return;
        const r = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: "attribute_referral", accessToken: token, ref }),
        });
        if (r.ok) {
          localStorage.setItem(DONE_KEY, "1");
          localStorage.removeItem(REF_KEY);
        }
      } catch { /* ignore */ }
    };

    attribute();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { if (alive) attribute(); });
    return () => { alive = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  return null;
}
