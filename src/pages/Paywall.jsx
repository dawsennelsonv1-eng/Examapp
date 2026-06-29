// src/pages/Paywall.jsx — v24
// Payment flow:
//   1. choose plan (Basic / Premium)
//   2. choose method (MonCash / NatCash) -> your receiving number appears (copy)
//   3. enter name + WhatsApp
//   4. proof: type transaction ID OR upload screenshot (one hides the other)
//   5. submit -> /api/content?task=verify_payment -> match SMS -> grant access
//
// Receiving numbers come from Vite env vars you set:
//   VITE_MONCASH_NUMBER, VITE_NATCASH_NUMBER
// Logos: drop official SVGs at /public/logos/moncash.svg and /public/logos/natcash.svg.
// Until then a clean branded tile shows (no copyrighted asset embedded).

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Check, Upload, Hash, Loader2, ShieldCheck,
  Crown, Zap, X, ChevronDown, Clock, Users,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { logEvent } from "../services/analytics";
import { PLAN_PRICES, PLAN_FEATURES, EXAM_DATES, PROF_PRIVE_HTG, SEMINAIRE_HTG } from "../utils/constants";
import { useEffectiveTrack } from "../hooks/useAdminAccess";
import { useAppConfig } from "../hooks/useAppConfig";
import WhatsAppPayButton from "../components/WhatsAppPayButton";
import AskToPay from "../components/AskToPay";
import { getPlanPricing, promoEndsAt, formatCountdown, daysUntil } from "../utils/promo";

// Prices and features come from constants.js (single source of truth) so they
// can never drift from the rest of the app again. Icons stay local (components).
const PLAN_ICONS = { basic: Zap, premium: Crown };

const PLANS = ["basic", "premium"].reduce((acc, id) => {
  const f = PLAN_FEATURES[id] || {};
  acc[id] = {
    id,
    name: f.label || (id === "premium" ? "Premium" : "Basic"),
    price: PLAN_PRICES[id],
    icon: PLAN_ICONS[id],
    features: Array.isArray(f.included) ? f.included : [],
  };
  return acc;
}, {});

const METHODS = {
  moncash: { id: "moncash", name: "MonCash", color: "#ED1C24", number: import.meta.env.VITE_MONCASH_NUMBER || "—", logo: "/logos/moncash.svg" },
  natcash: { id: "natcash", name: "NatCash", color: "#00A551", number: import.meta.env.VITE_NATCASH_NUMBER || "—", logo: "/logos/natcash.svg" },
};

export default function Paywall() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();

  const { config } = useAppConfig();

  const [searchParams] = useSearchParams();
  const [planId, setPlanId] = useState(searchParams.get("plan") === "premium" ? "premium" : "basic");
  const [methodId, setMethodId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [proofMode, setProofMode] = useState(null); // "id" | "screenshot"
  const [txId, setTxId] = useState("");
  const [shot, setShot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // {status, message}
  const [showOther, setShowOther] = useState(false); // MonCash/NatCash collapsible

  // Live countdown for the launch discount window.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const endsAt = promoEndsAt();
  const countdown = formatCountdown(endsAt - now);

  const livePrice = { basic: config?.price_basic ?? PLAN_PRICES.basic, premium: config?.price_premium ?? PLAN_PRICES.premium };
  const pricing = getPlanPricing(planId, livePrice[planId]);
  const plan = { ...PLANS[planId], price: pricing.price };

  // Real, honest urgency: days until THIS student's national exam.
  const track = useEffectiveTrack();
  const examInfo = EXAM_DATES[track] || EXAM_DATES["9AF"];
  const examDaysLeft = daysUntil(examInfo.start);

  // Current plan (for upgrade pricing). Referral rewards are claimed on Home,
  // not applied here, so the paywall only needs the plan tier.
  const [currentPlan, setCurrentPlan] = useState("free");
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) return;
        const { data: p } = await supabase.from("profiles").select("plan_tier").eq("id", uid).single();
        if (alive && p) setCurrentPlan(p.plan_tier || "free");
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, []);

  // Upgrade: a Basic subscriber pays only the difference to Premium.
  const upgradeCredit = currentPlan === "basic" && planId === "premium" ? (PLAN_PRICES.basic || 750) : 0;
  const totalDiscount = upgradeCredit;
  const method = methodId ? METHODS[methodId] : null;

  const copyNumber = () => {
    if (!method) return;
    navigator.clipboard?.writeText(method.number).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setShot(ev.target.result); setProofMode("screenshot"); };
    reader.readAsDataURL(file);
  };

  const canSubmit =
    method && name.trim() && whatsapp.trim() &&
    ((proofMode === "id" && txId.trim()) || (proofMode === "screenshot" && shot));

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess?.session?.access_token;
      if (!accessToken) { setResult({ status: "error", message: "Connectez-vous d'abord." }); setBusy(false); return; }

      const res = await fetch("/api/content?task=verify_payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          planTier: planId,
          method: methodId,
          amount: plan.price,
          proofType: proofMode,
          transactionId: proofMode === "id" ? txId.trim() : undefined,
          screenshotData: proofMode === "screenshot" ? shot : undefined,
          customerName: name.trim(),
          customerWhatsapp: whatsapp.trim(),
        }),
      });
      const body = await res.json();
      const data = body?.data || { status: "error", message: body?.message || "Erè." };
      setResult(data);
      logEvent("payment_attempt", { plan: planId, method: methodId, status: data.status });
      if (data.status === "verified") {
        updateProfile({ plan_tier: planId });
        setTimeout(() => navigate("/", { replace: true }), 2200);
      }
    } catch {
      setResult({ status: "error", message: "Pas de connexion. Réessayez." });
    } finally {
      setBusy(false);
    }
  };

  // Premium users get no pitch at all — just a confirmation.
  if (currentPlan === "premium") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md px-4 py-3 flex items-center gap-2 border-b border-white/10">
          <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div className="font-bold">Premium</div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-4">
            <Crown size={30} className="text-amber-300" />
          </div>
          <h1 className="text-2xl font-black mb-2">Tu es déjà Premium 🎉</h1>
          <p className="text-sm text-white/60 leading-relaxed mb-6">
            Tu as accès à tout jusqu'aux examens : scans, anciens examens, quiz, leçons et le prof IA en illimité. Bonne révision !
          </p>
          <button onClick={() => navigate("/")} className="px-6 py-3 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white font-bold">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-12">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md px-4 py-3 flex items-center gap-2 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <div className="font-bold">Passer à Premium</div>
      </header>

      <div className="px-4 pt-5 space-y-5 max-w-md mx-auto">
        {/* 1) PLANS — what you get + price. Tap a card to switch (right here at the top). */}
        <div className="grid grid-cols-2 gap-3">
          {Object.values(PLANS).map((p) => {
            const Icon = p.icon;
            const active = planId === p.id;
            const pr = getPlanPricing(p.id, livePrice[p.id]);
            return (
              <button key={p.id} onClick={() => setPlanId(p.id)}
                className={`text-left p-4 rounded-2xl ring-1 transition ${active ? "bg-gradient-to-br from-violet-600/30 to-indigo-700/20 ring-violet-500" : "bg-white/5 ring-white/10"}`}>
                <Icon size={20} className={active ? "text-violet-300" : "text-white/50"} />
                <div className="mt-2 font-black">{p.name}</div>
                <div className="text-sm text-white/80 mt-0.5">
                  <span className="font-black">{pr.price} HTG</span>
                  <span className="text-[11px] text-white/40"> /mois</span>
                </div>
                {pr.active && pr.savings > 0 && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[11px] text-white/35 line-through">{pr.anchor} HTG</span>
                    <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded-full">−{pr.savings}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* What the selected plan includes */}
        <ul className="space-y-1.5">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-white/70"><Check size={14} className="text-emerald-400" />{f}</li>
          ))}
        </ul>

        {upgradeCredit > 0 && (
          <div className="rounded-2xl px-4 py-3 bg-violet-500/10 ring-1 ring-violet-500/30 flex items-center gap-2.5">
            <Crown size={16} className="text-violet-300 shrink-0" />
            <div className="text-[12px] text-violet-50">
              <span className="font-black">Mise à niveau</span> — tu as déjà payé Basic, donc <span className="font-black">−{upgradeCredit} HTG</span> sur le Premium.
            </div>
          </div>
        )}

        {/* 2) PAY — and "pay for me" — right away, above the fold */}
        <div className="space-y-2">
          <WhatsAppPayButton planId={planId} livePrice={livePrice[planId]} extraDiscount={totalDiscount} />
          <AskToPay price={Math.max(plan.price - totalDiscount, 0)} />
          <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 px-3 py-2.5">
            <ShieldCheck size={16} className="text-emerald-300 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-50 leading-snug">
              <span className="font-bold">Sans risque.</span> Tu paies seulement parce que ça t'aide — pas de carte bancaire, aucun engagement.
            </p>
          </div>
        </div>

        {/* 3) Urgency + why-vs-ChatGPT — only for users who haven't paid */}
        {currentPlan !== "basic" && currentPlan !== "premium" && examDaysLeft != null && examDaysLeft > 0 && (
          <div className="rounded-2xl px-4 py-3 bg-gradient-to-r from-rose-600/20 to-amber-600/20 ring-1 ring-rose-500/30 flex items-center gap-3">
            <div className="text-3xl font-black tabular-nums text-rose-300 leading-none">{examDaysLeft}</div>
            <div className="text-[12px] text-rose-50 leading-snug">
              <span className="font-black">jour{examDaysLeft > 1 ? "s" : ""}</span> avant l'examen {examInfo.label} ({examInfo.range}). Chaque jour compte.
            </div>
          </div>
        )}

        {currentPlan !== "basic" && currentPlan !== "premium" && (
          <div className="rounded-2xl px-4 py-3 bg-violet-500/10 ring-1 ring-violet-500/25">
            <div className="text-[13px] text-white/90 leading-snug">
              <span className="font-black text-violet-200">ChatGPT ba ou yon repons.</span> Laureat AI montre w <span className="font-black">kijan jwenn li nan fòma egzat MENFP la</span> — pou w pa pèdi pwen yo.
            </div>
          </div>
        )}

        {/* Comparison — the detail, below the decision */}
        <div className="rounded-2xl p-4 bg-white/5 ring-1 ring-white/10">
          <h3 className="text-[11px] uppercase tracking-widest font-black text-white/50 mb-3">Compare par toi-même</h3>
          <div className="flex items-end mb-1">
            <span className="flex-1" />
            <span className="w-11 text-center text-[9px] font-black text-white/45 leading-tight">Prof<br/>privé</span>
            <span className="w-11 text-center text-[9px] font-black text-white/45 leading-tight">Sémi-<br/>naire</span>
            <span className="w-12 text-center text-[9px] font-black text-violet-300 leading-tight">Laureat<br/>AI</span>
          </div>
          {[
            { label: "Disponible 24h/24 (même à 2h du matin)", prof: false, sem: false },
            { label: "Sans te déplacer — sur ton téléphone", prof: false, sem: false },
            { label: "Anciens examens (toutes les années)", prof: false, sem: true },
            { label: "Leçons : ce qui tombe le plus à l'examen", prof: false, sem: false },
            { label: "Quiz illimités par matière", prof: false, sem: false },
            { label: "Prof IA illimité (scan + explications)", prof: false, sem: false },
          ].map((r, i) => (
            <div key={i} className="flex items-center py-2 border-t border-white/5">
              <span className="flex-1 text-[12px] text-white/80 pr-2 leading-snug">{r.label}</span>
              <span className="w-11 flex justify-center">{r.prof ? <Check size={15} className="text-emerald-400" /> : <X size={15} className="text-white/25" />}</span>
              <span className="w-11 flex justify-center">{r.sem ? <Check size={15} className="text-emerald-400" /> : <X size={15} className="text-white/25" />}</span>
              <span className="w-12 flex justify-center"><Check size={16} className="text-emerald-400" strokeWidth={3} /></span>
            </div>
          ))}
          <div className="flex items-center py-2 border-t border-white/10 mt-0.5">
            <span className="flex-1 text-[11px] font-bold text-white/55 pr-2">Prix</span>
            <span className="w-11 text-center text-[10px] font-bold text-white/55 leading-tight">{PROF_PRIVE_HTG.toLocaleString("fr-FR")}<br/>/mois</span>
            <span className="w-11 text-center text-[10px] font-bold text-white/55 leading-tight">{SEMINAIRE_HTG.toLocaleString("fr-FR")}</span>
            <span className="w-12 text-center text-[10px] font-black text-emerald-300 leading-tight">{Math.max(plan.price - totalDiscount, 0)}<br/>/mois</span>
          </div>
        </div>

        {/* Other payment methods (collapsed by default) */}
        <button onClick={() => setShowOther((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 text-[12px] text-white/45 py-1">
          Autres moyens de paiement (MonCash / NatCash)
          <ChevronDown size={14} className={`transition ${showOther ? "rotate-180" : ""}`} />
        </button>

        {showOther && (
        <div className="space-y-6">

        {/* Method picker */}
        <div>
          <div className="text-[11px] uppercase tracking-widest font-black text-white/50 mb-2">Méthode de paiement</div>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(METHODS).map((m) => {
              const active = methodId === m.id;
              return (
                <button key={m.id} onClick={() => setMethodId(m.id)}
                  className={`p-4 rounded-2xl ring-1 flex flex-col items-center gap-2 transition ${active ? "ring-white bg-white/10" : "ring-white/10 bg-white/5"}`}>
                  <LogoTile method={m} />
                  <span className="text-sm font-bold">{m.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Receiving number */}
        <AnimatePresence>
          {method && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-4 ring-1 ring-white/10" style={{ background: `${method.color}1A` }}>
              <div className="text-[11px] text-white/60 mb-1">Envoie {plan.price} HTG à ce numéro {method.name} :</div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-black tracking-wide">{method.number}</span>
                <button onClick={copyNumber} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-sm font-bold">
                  {copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Name + WhatsApp */}
        {method && (
          <div className="space-y-3">
            <Input label="Ton nom" value={name} onChange={setName} placeholder="Ex: Dawsen Nelson" />
            <Input label="Ton numéro WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="Ex: +509 ..." />
          </div>
        )}

        {/* Proof: ID or screenshot (mutually exclusive) */}
        {method && (
          <div>
            <div className="text-[11px] uppercase tracking-widest font-black text-white/50 mb-2">Preuve de paiement</div>

            {proofMode !== "screenshot" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-white/5 ring-1 ring-white/10 focus-within:ring-violet-500">
                  <Hash size={16} className="text-white/40" />
                  <input value={txId} onChange={(e) => { setTxId(e.target.value); setProofMode(e.target.value ? "id" : null); }}
                    placeholder="ID de transaction" className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-white/35" />
                </div>
                <label className="block text-center text-[12px] text-white/45 underline cursor-pointer py-1">
                  Ou donne plutôt une preuve par capture d'écran
                  <input type="file" accept="image/*" onChange={onPickFile} className="hidden" />
                </label>
              </div>
            )}

            {proofMode === "screenshot" && (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10">
                  <img src={shot} alt="preuve" className="w-full max-h-52 object-cover" />
                  <button onClick={() => { setShot(null); setProofMode(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                    <X size={15} />
                  </button>
                </div>
                <p className="text-[11px] text-white/45 text-center">On lira l'ID automatiquement sur la capture.</p>
                <label className="block text-center text-[12px] text-white/45 underline cursor-pointer py-1">
                  Ou entre plutôt l'ID à la main
                  <input type="file" accept="image/*" onChange={onPickFile} className="hidden" />
                </label>
                <button onClick={() => { setShot(null); setProofMode(null); }} className="w-full text-center text-[12px] text-white/45 underline">
                  Entrer l'ID à la main
                </button>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-4 text-sm font-semibold flex items-center gap-2 ${
                result.status === "verified" ? "bg-emerald-500/20 text-emerald-300"
                : result.status === "pending" ? "bg-amber-500/20 text-amber-200"
                : "bg-red-500/20 text-red-300"}`}>
              {result.status === "verified" ? <ShieldCheck size={18} /> : null}
              {result.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        {method && (
          <motion.button whileTap={{ scale: 0.98 }} onClick={submit} disabled={!canSubmit || busy}
            className="w-full py-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 font-black flex items-center justify-center gap-2 disabled:opacity-40">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <>Vérifier mon paiement</>}
          </motion.button>
        )}
        </div>
        )}

        {/* How payment works — explained at the bottom */}
        <div className="rounded-2xl p-4 bg-white/5 ring-1 ring-white/10 space-y-2">
          <div className="text-[11px] uppercase tracking-widest font-black text-white/50">Comment ça marche</div>
          <ol className="space-y-1.5 text-[12px] text-white/70 leading-snug list-decimal list-inside">
            <li>Tu envoies le message pré-écrit sur WhatsApp.</li>
            <li>On te demande ton nom et si tu paies par MonCash ou NatCash.</li>
            <li>On t'envoie le numéro — tu fais le transfert.</li>
            <li>Après paiement, on retrouve ton compte par ton nom (celui de ton profil) et on active ton plan.</li>
          </ol>
        </div>

        <p className="text-center text-[11px] text-white/35 flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} /> Paiement vérifié automatiquement. Chaque ID ne sert qu'une fois.
        </p>
      </div>
    </div>
  );
}

function LogoTile({ method }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img src={method.logo} alt={method.name} className="h-8 object-contain"
        onError={() => setFailed(true)} />
    );
  }
  // Fallback branded tile (no copyrighted asset): colored chip with initials.
  return (
    <div className="h-9 px-3 rounded-lg flex items-center justify-center font-black text-white text-sm"
      style={{ background: method.color }}>
      {method.name}
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <div className="text-[11px] text-white/50 mb-1 px-1">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3.5 rounded-2xl bg-white/5 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-violet-500 placeholder:text-white/35" />
    </div>
  );
}
