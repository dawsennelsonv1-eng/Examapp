// src/components/ReferralCard.jsx
// Home growth card, aligned to the real tiered referral backend:
//   - 2 paid friends  → claim free Basic
//   - 4 paid friends  → choose Premium upgrade OR 250 HTG cash
//   - beyond          → +250 HTG cash each (auto)
// Talks to /api/content tasks: referral_status, referral_claim_basic, referral_claim_tier2.

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Gift, Share2, Check, Loader2, Crown, Banknote } from "lucide-react";
import { supabase } from "../lib/supabase";

async function call(task, body = {}) {
  const { data: s } = await supabase.auth.getSession();
  const token = s?.session?.access_token;
  if (!token) return null;
  const r = await fetch("/api/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, accessToken: token, ...body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
  return j.data;
}

export default function ReferralCard() {
  const [uid, setUid] = useState(null);
  const [st, setSt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u?.user?.id) setUid(u.user.id);
      const d = await call("referral_status");
      if (d) setSt(d);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const link = uid ? `${window.location.origin}/?ref=${uid}` : window.location.origin;
  const text = `Je prépare mon examen national avec Laureat AI 🎓 Essaie gratuitement : ${link}`;

  const share = async () => {
    try { if (navigator.share) { await navigator.share({ title: "Laureat AI", text, url: link }); return; } } catch {}
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };

  const claimBasic = async () => { setBusy(true); try { await call("referral_claim_basic"); await load(); } catch {} setBusy(false); };
  const claimTier2 = async (choice) => { setBusy(true); try { await call("referral_claim_tier2", { choice }); await load(); } catch {} setBusy(false); };

  const paid = st?.paid || 0;
  const goal = st?.goal || 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 bg-gradient-to-br from-amber-500/15 to-orange-600/10 ring-1 ring-amber-500/30"
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Gift size={18} className="text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-white">Parraine et gagne</h3>
          <p className="text-[11px] text-white/60">2 amis qui paient → ton Plan Basic GRATUIT 🎁</p>
        </div>
        {st?.cashHtg > 0 && (
          <span className="text-[11px] font-black text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full">{st.cashHtg} HTG</span>
        )}
      </div>

      {/* progress to tier 1 (free Basic) */}
      <div className="flex items-center gap-2 mt-2 mb-3">
        {Array.from({ length: goal }).map((_, i) => (
          <div key={i} className={`flex-1 h-2 rounded-full ${i < paid ? "bg-amber-400" : "bg-white/10"}`} />
        ))}
        <span className="text-[11px] font-bold text-amber-200 tabular-nums">{Math.min(paid, goal)}/{goal}</span>
      </div>

      {/* Tier 1: claim free Basic */}
      {paid >= goal && !st?.basicClaimed && (
        <button onClick={claimBasic} disabled={busy}
          className="w-full mb-2 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Réclame ton Plan Basic GRATUIT
        </button>
      )}

      {/* Tier 2: at 4 paid, choose Premium or cash */}
      {paid >= 4 && !st?.tier2Choice && (
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button onClick={() => claimTier2("premium")} disabled={busy}
            className="py-2.5 rounded-xl bg-violet-500 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50">
            <Crown size={14} /> Premium
          </button>
          <button onClick={() => claimTier2("cash")} disabled={busy}
            className="py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50">
            <Banknote size={14} /> 250 HTG cash
          </button>
        </div>
      )}

      {st?.basicClaimed && paid < 4 && (
        <p className="text-[11px] text-emerald-300 font-bold mb-2">✓ Basic gratuit obtenu ! Parraine 2 de plus pour Premium ou 250 HTG cash.</p>
      )}

      <button onClick={share}
        className="w-full py-2.5 rounded-xl bg-white text-amber-700 text-sm font-black flex items-center justify-center gap-2">
        {copied ? <><Check size={15} /> Lien copié !</> : <><Share2 size={15} /> Partager mon lien</>}
      </button>
    </motion.div>
  );
}
