// src/components/scan/SolutionExtras.jsx
// v19: Two helpers:
//  - KeyFormulas: lists the formulas student must know for this exercise
//  - AnimatedReveal: word-by-word fade-in for the summary/explanation text

import { motion } from "framer-motion";
import { BookOpen, Sparkles } from "lucide-react";

export function KeyFormulas({ formulas = [] }) {
  if (!formulas?.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-4 ring-1 ring-amber-200 dark:ring-amber-700/40"
    >
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={14} className="text-amber-600 dark:text-amber-400" />
        <h3 className="text-[10px] uppercase tracking-widest font-black text-amber-700 dark:text-amber-400">
          Formules à connaître
        </h3>
      </div>

      <div className="space-y-2.5">
        {formulas.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * i }}
            className="bg-white dark:bg-slate-900 p-3 rounded-xl"
          >
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">{i + 1}.</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{f.name}</span>
            </div>
            <div className="font-mono font-bold text-base text-violet-700 dark:text-violet-300 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 inline-block">
              {f.expression}
            </div>
            {f.explanation && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                {f.explanation}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/**
 * Reveal text word-by-word so it feels like the tutor is writing it.
 * Used for the long summary in scan results.
 */
export function AnimatedReveal({ text, className = "", delayPerWord = 0.04, startDelay = 0 }) {
  if (!text) return null;
  const words = text.split(/(\s+)/); // preserve spaces

  return (
    <span className={className}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: startDelay + i * delayPerWord, duration: 0.18 }}
          className="inline"
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

export function SummaryCard({ text }) {
  if (!text) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-4 ring-1 ring-violet-200 dark:ring-violet-700/40"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-violet-600 dark:text-violet-400" />
        <h3 className="text-[10px] uppercase tracking-widest font-black text-violet-700 dark:text-violet-300">
          Résumé pédagogique
        </h3>
      </div>
      <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
        <AnimatedReveal text={text} delayPerWord={0.03} />
      </p>
    </motion.section>
  );
}
