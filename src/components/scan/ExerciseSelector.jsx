// src/components/scan/ExerciseSelector.jsx
// v19: When scan detects multiple exercises, user picks which one (or "all").

import { motion } from "framer-motion";
import { CheckCircle2, FileText, Layers } from "lucide-react";

export default function ExerciseSelector({ exercises = [], onSelect, onSelectAll }) {
  return (
    <div className="px-4 pt-4 pb-32 space-y-3">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {exercises.length} exercices détectés
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Lequel veux-tu résoudre ?
        </p>
      </div>

      {/* All-of-them option */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onSelectAll}
        className="w-full p-4 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-lg shadow-violet-500/30 flex items-center gap-3 text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          <Layers size={22} />
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-widest font-black opacity-90">Recommandé</div>
          <div className="font-bold text-base">Résoudre les {exercises.length} exercices</div>
          <div className="text-xs opacity-80 mt-0.5">L'AI les fait tous, un par un</div>
        </div>
      </motion.button>

      {/* Or pick one */}
      <div className="pt-2">
        <div className="text-[11px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-2 px-1">
          Ou choisis un seul:
        </div>
        <div className="space-y-2">
          {exercises.map((ex, i) => (
            <motion.button
              key={ex.index ?? i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(ex.index ?? i)}
              className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-start gap-3 text-left ring-1 ring-slate-200 dark:ring-slate-700"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                {ex.number || i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Exercice {ex.number || i + 1}</span>
                  {ex.hasUserSolution && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 size={9} />
                      Déjà résolu
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {ex.preview}
                </p>
              </div>
              <FileText size={16} className="text-slate-400 flex-shrink-0 mt-1" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
