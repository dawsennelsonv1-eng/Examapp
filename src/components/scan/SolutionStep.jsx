// src/components/scan/SolutionStep.jsx
// A single step in a solution, renders different types: formula, substitution, result, conversion, etc.
// Used both in ScanSolve (final solution display) and Classroom (when board reveals steps).

import { motion } from "framer-motion";

export default function SolutionStep({ step, index, problemStatement }) {
  if (!step) return null;

  const baseClasses = "font-mono text-xs leading-relaxed";

  if (step.type === "result" && step.boxed) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.05 }}
        className="my-2 inline-block px-3 py-1.5 border-2 border-emerald-500 dark:border-emerald-400 rounded-md bg-emerald-50 dark:bg-emerald-950/30"
      >
        <span className={`${baseClasses} font-bold text-emerald-700 dark:text-emerald-300`}>
          {step.content}
        </span>
      </motion.div>
    );
  }

  if (step.type === "conversion") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`${baseClasses} text-blue-700 dark:text-blue-400 italic`}
      >
        ⤳ {step.content}
        {step.note && (
          <span className="text-[10px] ml-2 opacity-75 not-italic">({step.note})</span>
        )}
      </motion.div>
    );
  }

  if (step.type === "deduction") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`${baseClasses} text-slate-700 dark:text-slate-300`}
      >
        <span className="italic text-violet-600 dark:text-violet-400">→ </span>
        {step.content}
      </motion.div>
    );
  }

  if (step.type === "note") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.05 }}
        className="text-slate-500 dark:text-slate-400 text-xs italic font-sans"
      >
        {step.content}
      </motion.div>
    );
  }

  // Default: formula, substitution, plain text
  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`${baseClasses} text-slate-700 dark:text-slate-300`}
    >
      {step.content}
    </motion.div>
  );
}
