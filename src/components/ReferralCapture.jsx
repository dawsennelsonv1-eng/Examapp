// src/components/ReferralCapture.jsx
// Attribution capture (mounted once near the app root; renders nothing).
//   1) Referral: captures ?ref=<userId> into localStorage (first touch wins),
//      then records who referred the visitor once they're signed in.
//   2) Meta ads: captures the Pixel's _fbc (click id) and _fbp (browser id) —
//      synthesizing _fbc from ?fbclid= if the cookie isn't set yet — and saves
//      them onto the user's own profile once signed in. This lets the server
//      fire a fully-matched Purchase later (even on a manual admin grant) so
//      Meta can attribute the sale back to the ad. RLS allows own-profile update.

import { useEffect } from "react";
import { supabase } from "../lib/supabase";

const REF_KEY = "laureat.refCode";
const DONE_KEY = "laureat.refAttributed";

const FBC_KEY = "laureat.fbc";
const FBP_KEY = "laureat.fbp";
const FBC_DONE = "laureat.fbcSaved";
const FBP_DONE = "laureat.fbpSaved";

function readCookie(name) {
  try {
    const esc = name.replace(/([.$?*|{}()\[\]\\\/+^])/g, "\\$1");
    const m = document.cookie.match(new RegExp("(?:^|; )" + esc + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

// Cookie -> localStorage. Survives the OAuth redirect, which can drop URL params.
// _fbp is only ever set by the Pixel (can't be synthesized). _fbc is set by the
// Pixel when the visit carries ?fbclid=; if the cookie isn't there yet we build
// it in Meta's documented format: fb.1.<timestamp_ms>.<fbclid>.
function captureFb() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid");

    let fbc = readCookie("_fbc") || localStorage.getItem(FBC_KEY);
    if (!fbc && fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    if (fbc) localStorage.setItem(FBC_KEY, fbc);

    const fbp = readCookie("_fbp") || localStorage.getItem(FBP_KEY);
    if (fbp) localStorage.setItem(FBP_KEY, fbp);
  } catch {
    /* ignore */
  }
}

export default function ReferralCapture() {
  useEffect(() => {
    // Capture ?ref= on any load (first touch wins).
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && !localStorage.getItem(DONE_KEY) && !localStorage.getItem(REF_KEY)) {
        localStorage.setItem(REF_KEY, ref);
      }
    } catch {}

    // Capture Meta identifiers on any load.
    captureFb();

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

    // Write fbc/fbp onto the signed-in user's own profile (only the values that
    // haven't already been saved, so this is a no-op once persisted).
    const persistFb = async () => {
      try {
        captureFb(); // re-read in case the Pixel set the cookies just after load
        const fbc = localStorage.getItem(FBC_KEY);
        const fbp = localStorage.getItem(FBP_KEY);
        if (!fbc && !fbp) return;

        const patch = {};
        if (fbc && localStorage.getItem(FBC_DONE) !== fbc) patch.fbc = fbc;
        if (fbp && localStorage.getItem(FBP_DONE) !== fbp) patch.fbp = fbp;
        if (Object.keys(patch).length === 0) return;

        const { data: s } = await supabase.auth.getSession();
        const uid = s?.session?.user?.id;
        if (!uid) return;

        const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
        if (!error) {
          if (patch.fbc) localStorage.setItem(FBC_DONE, patch.fbc);
          if (patch.fbp) localStorage.setItem(FBP_DONE, patch.fbp);
        }
      } catch { /* ignore — tracking must never break the app */ }
    };

    attribute();
    persistFb();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (!alive) return;
      attribute();
      persistFb();
    });

    return () => { alive = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  return null;
}
