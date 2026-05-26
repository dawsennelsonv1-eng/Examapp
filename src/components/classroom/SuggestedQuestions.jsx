// src/components/classroom/SuggestedQuestions.jsx
// Claude-style suggested question chips. Compact, max 3, dismissible.

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

export default function SuggestedQuestions({ questions = [], onPick, onDismiss }) {
  if (!questions.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="px-3 py-2 border-t border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles size={11} className="text-violet-500" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              Suggestions
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={12} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {questions.slice(0, 3).map((q, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPick(q)}
              className="text-xs px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/50 hover:bg-violet-100 dark:hover:bg-violet-950/60 transition-colors"
            >
              {q}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
