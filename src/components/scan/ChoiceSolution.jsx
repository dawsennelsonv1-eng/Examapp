// src/components/scan/ChoiceSolution.jsx — v24 (Package 1)
// Renders the solution for NON-science subjects (biologie, histoire, langues, QCM,
// compléter). Format: correct answer → why correct → why the 3 plausible options
// are wrong → key facts. NO Données/Solution split here.
// If the AI flagged needsSchema, an optional schema slot is shown (filled by the
// caller via the `schema` prop, e.g. an AI-generated SVG).

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, BookMarked } from "lucide-react";
import { AnimatedReveal } from "./SolutionExtras";

export default function ChoiceSolution({ solution, schema = null }) {
  if (!solution) return null;
  const { correctAnswer, whyCorrect, otherOptions = [], keyFacts = [] } = solution;

  return (
    <div className="space-y-4">
      {/* Correct answer */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 ring-1 ring-emerald-200 dark:ring-emerald-700/40"
      >
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-[10px] uppercase tracking-widest font-black text-emerald-700 dark:text-emerald-400">
            Bonne réponse
          </h3>
        </div>
        <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">{correctAnswer}</p>
        {whyCorrect && (
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <AnimatedReveal text={whyCorrect} delayPerWord={0.02} />
          </p>
        )}
      </motion.section>

      {/* Optional schema */}
      {schema && (
        <section className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm">
          <div className="flex items-center justify-center bg-white rounded-lg overflow-hidden"
            dangerouslySetInnerHTML={{ __html: schema }} />
        </section>
      )}

      {/* Why the other options are wrong */}
      {otherOptions.length > 0 && (
        <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={14} className="text-red-500" />
            <h3 className="text-[10px] uppercase tracking-widest font-black text-red-600 dark:text-red-400">
              Pourquoi les autres sont faux
            </h3>
          </div>
          <div className="space-y-2.5">
            {otherOptions.map((o, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i }}
                className="rounded-xl bg-red-50 dark:bg-red-950/20 p-3 ring-1 ring-red-100 dark:ring-red-900/40">
                <p className="text-xs font-semibold text-slate-900 dark:text-white mb-0.5">{o.option}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{o.whyWrong}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Key facts */}
      {keyFacts.length > 0 && (
        <section className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-4 ring-1 ring-violet-200 dark:ring-violet-700/40">
          <div className="flex items-center gap-2 mb-2">
            <BookMarked size={14} className="text-violet-600 dark:text-violet-400" />
            <h3 className="text-[10px] uppercase tracking-widest font-black text-violet-700 dark:text-violet-300">
              À retenir
            </h3>
          </div>
          <ul className="space-y-1.5">
            {keyFacts.map((f, i) => (
              <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex gap-2 leading-relaxed">
                <span className="text-violet-500 flex-shrink-0">•</span><span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
