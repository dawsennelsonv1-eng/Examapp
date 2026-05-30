// src/components/scan/VerificationResult.jsx
// v19: Shown when scan mode = "verify". Displays verdict, mistakes,
// strengths, correct solution, and tips.

import { motion } from "framer-motion";
import {
  CheckCircle2, AlertTriangle, XCircle, Lightbulb,
  ThumbsUp, Award,
} from "lucide-react";

const VERDICT_CONFIG = {
  correct: {
    icon: CheckCircle2,
    label: "Correct!",
    color: "from-emerald-500 to-teal-600",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    ring: "ring-emerald-300 dark:ring-emerald-700",
  },
  partiellement_correct: {
    icon: AlertTriangle,
    label: "Presque",
    color: "from-amber-500 to-orange-600",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    ring: "ring-amber-300 dark:ring-amber-700",
  },
  incorrect: {
    icon: XCircle,
    label: "À revoir",
    color: "from-red-500 to-rose-600",
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30",
    ring: "ring-red-300 dark:ring-red-700",
  },
};

export default function VerificationResult({ verdict = "incorrect", verdictScore = 0, mistakes = [], strengths = [], tips = [] }) {
  const cfg = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.incorrect;
  const Icon = cfg.icon;

  return (
    <div className="space-y-3">
      {/* Verdict header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-4 ${cfg.bg} ring-1 ${cfg.ring}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shadow-md`}>
            <Icon size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <div className={`text-[10px] uppercase tracking-widest font-black ${cfg.text}`}>Vérification</div>
            <div className="font-bold text-slate-900 dark:text-white text-lg">{cfg.label}</div>
            {verdictScore > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Score: <span className={`font-bold ${cfg.text}`}>{verdictScore}/100</span>
              </div>
            )}
          </div>
        </div>

        {/* Score bar */}
        {verdictScore > 0 && (
          <div className="mt-3 h-2 rounded-full bg-white/50 dark:bg-slate-800/50 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${verdictScore}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full bg-gradient-to-r ${cfg.color}`}
            />
          </div>
        )}
      </motion.div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp size={14} className="text-emerald-500" />
            <h3 className="text-[10px] uppercase tracking-widest font-black text-emerald-700 dark:text-emerald-400">Ce qui était bien</h3>
          </div>
          <ul className="space-y-1.5">
            {strengths.map((s, i) => (
              <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex gap-2 leading-relaxed">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Mistakes */}
      {mistakes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-500" />
            <h3 className="text-[10px] uppercase tracking-widest font-black text-amber-700 dark:text-amber-400">Erreurs à corriger</h3>
          </div>
          <div className="space-y-3">
            {mistakes.map((m, i) => (
              <div key={i} className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3 ring-1 ring-amber-200 dark:ring-amber-700/40">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">{m.where}</span>
                </div>
                <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed mb-1.5">{m.description}</p>
                {m.correction && (
                  <div className="mt-2 p-2 rounded-lg bg-white dark:bg-slate-800 ring-1 ring-emerald-200 dark:ring-emerald-800">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">Correction</div>
                    <p className="text-xs text-slate-900 dark:text-slate-100 font-mono leading-relaxed">{m.correction}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-4 ring-1 ring-violet-200 dark:ring-violet-700/40">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} className="text-violet-600 dark:text-violet-400" />
            <h3 className="text-[10px] uppercase tracking-widest font-black text-violet-700 dark:text-violet-300">Conseils pour la prochaine fois</h3>
          </div>
          <ul className="space-y-1.5">
            {tips.map((t, i) => (
              <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex gap-2 leading-relaxed">
                <Award size={11} className="text-violet-500 flex-shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
