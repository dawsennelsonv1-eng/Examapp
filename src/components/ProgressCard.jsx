// src/components/ProgressCard.jsx — v24
// Compact progress summary for Home/Cours: lessons completed (out of a total)
// and quiz average. Pass `totalEvents` from coursData for the track if you want
// a real denominator; otherwise it shows just the completed count.

import { motion } from "framer-motion";
import { BookOpenCheck, Target } from "lucide-react";
import { useProgress } from "../hooks/useProgress";
import { useApp } from "../contexts/AppContext";
import { countEventsForTrack } from "../utils/coursData";

export default function ProgressCard({ totalEvents = null }) {
  const { completedCount, quizAverage, quizCount } = useProgress();
  const { track } = useApp();

  // If a denominator isn't passed, compute it from the track's lesson count.
  const denom = totalEvents != null ? totalEvents : countEventsForTrack(track);

  if (completedCount === 0 && quizCount === 0) return null; // nothing yet — don't clutter

  const pct = denom ? Math.min(100, Math.round((completedCount / denom) * 100)) : null;
  const totalLabel = denom || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800"
    >
      <h3 className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-3">
        Ta progression
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
            <BookOpenCheck size={18} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white leading-none">
              {completedCount}{totalLabel ? <span className="text-sm text-slate-400">/{totalLabel}</span> : null}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">leçons finies</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <Target size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white leading-none">
              {quizAverage != null ? `${quizAverage}%` : "—"}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">moyenne quiz</div>
          </div>
        </div>
      </div>

      {pct != null && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6 }}
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-600"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
