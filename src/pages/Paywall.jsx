// src/pages/Paywall.jsx
// MonCash/NatCash payment with transaction ID validation.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Check, Loader2, Copy, ChevronRight,
  Lock, Zap, Crown, AlertCircle, Phone,
} from "lucide-react";
import { useUsage } from "../hooks/useUsage";

// REPLACE WITH YOUR REAL PHONE NUMBERS
const MONCASH_NUMBER = "+509 XXXX-XXXX";
const NATCASH_NUMBER = "+509 XXXX-XXXX";

const PLANS = [
  {
    id: "basic", name: "Basic", price: 900, icon: Zap, color: "from-blue-500 to-cyan-600",
    features: [
      "15 scans par jour", "50 messages au prof par jour",
      "5 schémas au tableau par jour", "20 quiz par jour",
      "Accès aux examens passés",
    ],
  },
  {
    id: "premium", name: "Premium", price: 2400, icon: Crown, color: "from-amber-500 to-orange-600",
    features: [
      "Scans illimités", "Messages illimités",
      "Schémas illimités", "Quiz illimités",
      "Voix HD (ElevenLabs)", "Support prioritaire",
    ],
  },
];

export default function Paywall({ onSuccess }) {
  const { upgradePlan } = useUsage();
  const [step, setStep] = useState("choose");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [txId, setTxId] = useState("");
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);

  const pickPlan = (plan) => { setSelectedPlan(plan); setStep("pay"); };

  const copyNumber = (num) => { navigator.clipboard?.writeText(num); };

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
        setError("Transaction non trouvée. Vérifie l'ID ou attends quelques minutes.");
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-10">
        <button onClick={() => setStep("choose")} className="text-sm text-violet-600 font-semibold">← Retour</button>
      </header>
      <div className="px-4 py-6 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Paiement - {selectedPlan.name}</h1>
        <p className="text-sm text-slate-500 mb-6">Envoie <b>{selectedPlan.price} HTG</b> à l'un de ces numéros</p>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
              <Phone size={16} className="text-white" />
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">MonCash</div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-lg font-mono font-bold text-slate-900 dark:text-white">{MONCASH_NUMBER}</code>
            <button onClick={() => copyNumber(MONCASH_NUMBER)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Copy size={12} />Copier
            </button>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Phone size={16} className="text-white" />
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">NatCash</div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-lg font-mono font-bold text-slate-900 dark:text-white">{NATCASH_NUMBER}</code>
            <button onClick={() => copyNumber(NATCASH_NUMBER)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Copy size={12} />Copier
            </button>
          </div>
        </div>
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 p-4 mb-6">
          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <b className="block mb-1">Important</b>
              Après avoir payé, tu recevras un SMS avec un <b>ID de transaction</b>. Colle cet ID ci-dessous pour activer ton plan.
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">ID de transaction</label>
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
            {validating ? (<><Loader2 size={16} className="animate-spin" />Validation...</>) : (<><CreditCard size={16} />Activer mon plan</>)}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
