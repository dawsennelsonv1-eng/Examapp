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
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Check, Upload, Hash, Loader2, ShieldCheck,
  Crown, Zap, X, ChevronDown, Clock,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { logEvent } from "../services/analytics";
import { PLAN_PRICES, PLAN_FEATURES } from "../utils/constants";
import { useAppConfig } from "../hooks/useAppConfig";
import WhatsAppPayButton from "../components/WhatsAppPayButton";
import { getPlanPricing, promoEndsAt, formatCountdown } from "../utils/promo";

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

  const [planId, setPlanId] = useState("premium");
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
      if (!accessToken) { setResult({ status: "error", message: "Konekte anvan." }); setBusy(false); return; }

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
      setResult({ status: "error", message: "Pa gen koneksyon. Eseye ankò." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-12">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md px-4 py-3 flex items-center gap-2 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <div className="font-bold">Passer à Premium</div>
      </header>

      <div className="px-4 pt-5 space-y-6 max-w-md mx-auto">
        {/* Plan picker */}
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
                  <span className="text-[11px] text-white/40"> {"jiska egzamen"}</span>
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

        {/* Discount urgency banner */}
        {pricing.active && countdown && (
          <div className="rounded-2xl px-4 py-3 bg-emerald-500/10 ring-1 ring-emerald-500/30 flex items-center gap-2.5">
            <Clock size={16} className="text-emerald-300 shrink-0" />
            <div className="text-[12px] text-emerald-100">
              <span className="font-black">Òf espesyal</span> — ekonomize <span className="font-black">{pricing.savings} HTG</span>. Fini nan <span className="font-black tabular-nums">{countdown}</span>.
            </div>
          </div>
        )}

        {/* PRIMARY: pay on WhatsApp */}
        <div className="space-y-2">
          <WhatsAppPayButton planId={planId} livePrice={livePrice[planId]} />
          <p className="text-center text-[11px] text-white/45 px-2">
            Klike, voye mesaj la, epi nou ap aktive kont ou apre peman an. Pi fasil la.
          </p>
        </div>

        <ul className="space-y-1.5">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-white/70"><Check size={14} className="text-emerald-400" />{f}</li>
          ))}
        </ul>

        {/* Other payment methods (collapsed by default) */}
        <button onClick={() => setShowOther((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 text-[12px] text-white/45 py-1">
          Lòt fason pou peye (MonCash / NatCash)
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
