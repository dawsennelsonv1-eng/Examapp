// src/components/ReferralCard.jsx
// Home referral hub. Shows how many friends signed up via your link, how many
// PAID, and the escalating rewards:
//   • 2 paid  → free Basic plan (claim)
//   • 4 paid  → choose Premium OR 250 HTG cash
//   • 6,8,…   → 250 HTG cash for every extra 2 paid friends
// Plus a one-tap share. Reads/writes status through /api/content.

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Gift, Share2, Check, Crown, Coins, Users, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getWhatsAppNumber } from "../utils/promo";

async function call(task, body = {}) {
  const { data: s } = await supabase.auth.getSession();
  const token = s?.session?.access_token;
  const r = await fetch("/api/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, accessToken: token, ...body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "err");
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
      const id = u?.user?.id;
      if (!id) return;
      setUid(id);
      setSt(await call("referral_status"));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const link = uid ? `${window.location.origin}/?ref=${uid}` : window.location.origin;
  const text = `Je prépare mon examen national avec Laureat AI 🎓 Essaie gratuitement : ${link}`;

  const share = async () => {
    try { if (navigator.share) { await navigator.share({ title: "Laureat AI", text, url: link }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };

  const claimBasic = async () => { setBusy(true); try { await call("referral_claim_basic"); await load(); } catch {} setBusy(false); };
  const claimTier2 = async (choice) => { setBusy(true); try { await call("referral_claim_tier2", { choice }); await load(); } catch {} setBusy(false); };

  const cashWhatsApp = () => {
    const num = getWhatsAppNumber();
    if (!num) return;
    const msg = `Bonjour ! J'ai gagné ${st?.cashHtg || 0} HTG en parrainage sur Laureat AI. Je voudrais le recevoir.`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const paid = st?.paid ?? 0;
  const referred = st?.referred ?? 0;
  const reward = st?.reward ?? 250;

  // What's the next milestone message?
  let nextLine = `Invite 2 amis qui paient → plan Basic GRATUIT.`;
  if (paid >= 2 && paid < 4) nextLine = `Encore ${4 - paid} ami(s) payant(s) → Premium ou ${reward} HTG.`;
  else if (paid >= 4) nextLine = `Chaque 2 amis qui paient → ${reward} HTG. À l'infini.`;
  else if (paid === 1) nextLine = `Encore 1 ami qui paie → plan Basic GRATUIT.`;

  const showClaimBasic = st && paid >= 2 && !st.basicClaimed;
  const showTier2 = st && paid >= 4 && !st.tier2Choice;
  const showCash = st && (st.cashHtg || 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 bg-gradient-to-br from-amber-500/20 to-orange-600/10 ring-1 ring-amber-500/30"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/25 flex items-center justify-center">
          <Gift size={20} className="text-amber-300" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-white">Invite tes amis, gagne gros</h3>
          <p className="text-[11px] text-amber-100/70">{nextLine}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl bg-black/20 p-2.5 text-center">
          <div className="text-lg font-black text-white tabular-nums">{referred}</div>
          <div className="text-[10px] text-white/55">inscrits via toi</div>
        </div>
        <div className="rounded-xl bg-black/20 p-2.5 text-center">
          <div className="text-lg font-black text-emerald-300 tabular-nums">{paid}</div>
          <div className="text-[10px] text-white/55">ont payé</div>
        </div>
      </div>

      {/* Reward claims */}
      {showClaimBasic && (
        <button onClick={claimBasic} disabled={busy}
          className="w-full mb-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Réclame ton plan Basic GRATUIT
        </button>
      )}
      {showTier2 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button onClick={() => claimTier2("premium")} disabled={busy}
            className="py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-700 text-white text-[13px] font-black flex items-center justify-center gap-1.5 disabled:opacity-60">
            <Crown size={14} /> Premium
          </button>
          <button onClick={() => claimTier2("cash")} disabled={busy}
            className="py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[13px] font-black flex items-center justify-center gap-1.5 disabled:opacity-60">
            <Coins size={14} /> {reward} HTG
          </button>
        </div>
      )}
      {showCash && (
        <button onClick={cashWhatsApp}
          className="w-full mb-2 py-2.5 rounded-xl bg-amber-500/20 ring-1 ring-amber-400/40 text-amber-100 text-[13px] font-bold flex items-center justify-center gap-2">
          <Coins size={14} /> Tu as gagné {st.cashHtg} HTG — réclame-les
        </button>
      )}

      <button onClick={share}
        className="w-full py-2.5 rounded-xl bg-white text-amber-700 text-sm font-black flex items-center justify-center gap-2">
        {copied ? <><Check size={15} /> Lien copié !</> : <><Share2 size={15} /> Partager mon lien</>}
      </button>
    </motion.div>
  );
}
