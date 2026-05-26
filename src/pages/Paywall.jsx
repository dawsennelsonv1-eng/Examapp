// src/pages/Paywall.jsx
// v8: Provider chosen FIRST (MonCash or NatCash), then number/name displayed.
// Real phone numbers + Brunelley A Nelson as owner name.
// Numbers can be edited from /admin (stored in localStorage + synced from server config).

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, ChevronRight, Lock, Zap, Crown, AlertCircle,
  Phone, ArrowLeft, Loader2, Check,
} from "lucide-react";
import { useUsage } from "../hooks/useUsage";

// Defaults — get overridden by admin config in localStorage
const DEFAULT_CONFIG = {
  moncash: { number: "+509 3731-8656", name: "Brunelley A Nelson" },
  natcash: { number: "+509 4151-8331", name: "Brunelley A Nelson" },
};

const PLANS = [
  {
    id: "basic", name: "Basic", price: 900, icon: Zap, color: "from-blue-500 to-cyan-600",
    features: [
      "15 scans par jour", "50 messages au prof par jour",
      "5 schémas au tableau par jour", "20 quiz par jour",
    ],
  },
  {
    id: "premium", name: "Premium", price: 2400, icon: Crown, color: "from-amber-500 to-orange-600",
    features: [
      "Scans illimités", "Messages illimités",
      "Schémas illimités", "Quiz illimités",
      "Voix HD (Fish Audio S2)", "Support prioritaire",
    ],
  },
];

function loadPaymentConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem("laureat.paymentConfig") || "{}");
    return {
      moncash: { ...DEFAULT_CONFIG.moncash, ...(stored.moncash || {}) },
      natcash: { ...DEFAULT_CONFIG.natcash, ...(stored.natcash || {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export default function Paywall({ onSuccess }) {
  const { upgradePlan } = useUsage();
  const [step, setStep] = useState("choose"); // choose | provider | pay
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [provider, setProvider] = useState(null);
  const [txId, setTxId] = useState("");
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    setConfig(loadPaymentConfig());
    // Also try to load from server-side admin config
    fetch("/api/config")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.data?.paymentConfig) {
          setConfig(data.data.paymentConfig);
          localStorage.setItem("laureat.paymentConfig", JSON.stringify(data.data.paymentConfig));
        }
      })
      .catch(() => {});
  }, []);

  const pickPlan = (plan) => {
    setSelectedPlan(plan);
    setStep("provider");
  };

  const pickProvider = (p) => {
    setProvider(p);
    setStep("pay");
  };

  const copyNumber = (num) => {
    navigator.clipboard?.writeText(num.replace(/\s/g, ""));
  };

  const validateTransaction = async () => {
    if (!txId.trim() || txId.trim().length < 6) {
      setError("ID de transaction trop court");
      return;
    }
    setValidating(true);
    setError(null);
    try {
      const response = await fetch(`/api/payment-webhook?txId=${encodeURIComponent(txId.trim())}`);
      const data = await response.json();
      if (response.status === 404) {
        setError("Transaction non trouvée. Vérifie l'ID ou attends quelques minutes après le paiement.");
        return;
      }
      if (response.status === 409) {
        setError("Cette transaction a déjà été utilisée.");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Erreur de validation");

      const plan = data.data.plan;
      if (plan !== selectedPlan?.id) {
        setError(`Le montant payé (${data.data.amount} HTG) correspond au plan ${plan}, pas ${selectedPlan?.name}.`);
        return;
      }
      upgradePlan(plan);
      onSuccess?.(plan);
    } catch (err) {
      setError(err.message || "Erreur. Réessaye.");
    } finally {
      setValidating(false);
    }
  };

  // STEP 1: Choose plan
  if (step === "choose") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-950 dark:to-violet-950/30 px-4 py-8 pb-28">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center mx-auto mb-3 shadow-xl">
            <Lock size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Débloque tout le potentiel</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
            Le MENFP arrive vite. Prépare-toi sans limites.
          </p>
        </div>
        <div className="space-y-3 max-w-md mx-auto">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <motion.button key={plan.id} whileTap={{ scale: 0.98 }} onClick={() => pickPlan(plan)}
                className="w-full text-left rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-lg">
                <div className="flex items-start gap-4 mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-md`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg text-slate-900 dark:text-white">{plan.name}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {plan.price} <span className="text-sm font-normal text-slate-500">HTG / mois</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-400" />
                </div>
                <ul className="space-y-1.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <Check size={14} className="text-emerald-500 flex-shrink-0" /><span>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // STEP 2: Choose provider (MonCash or NatCash) — provider chosen FIRST
  if (step === "provider") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
          <button onClick={() => setStep("choose")} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-900 dark:text-white">Choisis ton mode de paiement</div>
            <div className="text-[11px] text-slate-500">Plan {selectedPlan?.name} · {selectedPlan?.price} HTG</div>
          </div>
        </header>

        <div className="px-4 py-6 max-w-md mx-auto space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 text-center">
            Comment veux-tu envoyer l'argent ?
          </p>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => pickProvider("moncash")}
            className="w-full rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-md flex items-center gap-4 border-2 border-transparent hover:border-red-500 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
              <Phone size={26} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-lg text-slate-900 dark:text-white">MonCash</div>
              <div className="text-xs text-slate-500">Digicel</div>
            </div>
            <ChevronRight size={22} className="text-slate-400" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => pickProvider("natcash")}
            className="w-full rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-md flex items-center gap-4 border-2 border-transparent hover:border-blue-500 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
              <Phone size={26} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-lg text-slate-900 dark:text-white">NatCash</div>
              <div className="text-xs text-slate-500">Natcom</div>
            </div>
            <ChevronRight size={22} className="text-slate-400" />
          </motion.button>
        </div>
      </div>
    );
  }

  // STEP 3: Pay (with dynamic number/name based on provider)
  const currentConfig = provider === "moncash" ? config.moncash : config.natcash;
  const providerColor = provider === "moncash" ? "from-red-500 to-red-700" : "from-blue-500 to-blue-700";
  const providerName = provider === "moncash" ? "MonCash" : "NatCash";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => setStep("provider")} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-sm font-bold text-slate-900 dark:text-white">Paiement {providerName}</div>
          <div className="text-[11px] text-slate-500">Plan {selectedPlan?.name} · {selectedPlan?.price} HTG</div>
        </div>
      </header>

      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Big card showing where to send money */}
        <div className={`rounded-3xl bg-gradient-to-br ${providerColor} p-6 shadow-2xl mb-6 text-white`}>
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-2">
              Envoie l'argent à
            </div>
            <div className="text-3xl font-black mb-1">{providerName}</div>
            <div className="text-sm font-semibold opacity-90 mb-4">{currentConfig.name}</div>

            <div className="rounded-2xl bg-white/20 backdrop-blur-sm p-4 mb-3">
              <div className="text-3xl font-bold font-mono tracking-wider mb-2">
                {currentConfig.number}
              </div>
              <button
                onClick={() => copyNumber(currentConfig.number)}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold"
              >
                <Copy size={12} /> Copier le numéro
              </button>
            </div>

            <div className="text-3xl font-black">
              {selectedPlan.price} <span className="text-lg font-semibold opacity-80">HTG</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 p-4 mb-6">
          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <b className="block mb-1">Après le paiement</b>
              Tu recevras un SMS avec un <b>ID de transaction</b>. Colle cet ID ci-dessous pour activer ton plan.
            </div>
          </div>
        </div>

        {/* Transaction ID input */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
            ID de transaction
          </label>
          <input type="text" value={txId} onChange={(e) => setTxId(e.target.value.toUpperCase())}
            placeholder="Ex: 12345678 ou ABC123XYZ"
            className="w-full px-3 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          {error && (
            <div className="text-xs text-red-500 mb-3 flex items-start gap-1.5">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          <motion.button whileTap={{ scale: 0.97 }} onClick={validateTransaction} disabled={validating || !txId.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {validating ? (<><Loader2 size={16} className="animate-spin" />Validation...</>) : (<>Activer mon plan</>)}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
