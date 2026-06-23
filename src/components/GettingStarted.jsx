// src/components/GettingStarted.jsx
// Gamified first-steps checklist on Home. Reads the "first…" flags set by
// logUsage. Disappears once everything is done (or dismissed). French.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, GraduationCap, ListChecks, BookOpen, CheckCircle2, Circle, X, Trophy } from "lucide-react";

const DISMISS_KEY = "laureat.goalsDismissed";

const GOALS = [
  { flag: "laureat.firstScanDone",   label: "Scanne ton 1er exercice", icon: ScanLine,      to: "/scan" },
  { flag: "laureat.firstTutorDone",  label: "Parle avec le prof",      icon: GraduationCap, to: "/classe" },
  { flag: "laureat.firstQuizDone",   label: "Fais ton 1er quiz",       icon: ListChecks,    to: "/reviser" },
  { flag: "laureat.firstLessonDone", label: "Ouvre ta 1ère leçon",     icon: BookOpen,      to: "/cours" },
];

function readDone() {
  const out = {};
  try { GOALS.forEach((g) => { out[g.flag] = !!localStorage.getItem(g.flag); }); } catch {}
  return out;
}

export default function GettingStarted() {
  const navigate = useNavigate();
  const [done, setDone] = useState(readDone);
  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem(DISMISS_KEY); } catch { return false; }
  });

  // Re-check flags when returning to Home (they flip on other pages).
  useEffect(() => {
    const t = setInterval(() => setDone(readDone()), 2000);
    const onVis = () => setDone(readDone());
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const total = GOALS.length;
  const completed = GOALS.filter((g) => done[g.flag]).length;
  const allDone = completed === total;

  if (dismissed) return null;

  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, "1"); } catch {} setDismissed(true); };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className="rounded-2xl bg-slate-900 ring-1 ring-slate-800 p-4 relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-1 pr-6">
          <div className="flex items-center gap-2">
            {allDone ? <Trophy size={16} className="text-amber-400" /> : null}
            <h3 className="text-sm font-black text-white">
              {allDone ? "Bravo, tu es prêt ! 🎉" : "Premiers pas"}
            </h3>
          </div>
          <span className="text-[11px] font-bold text-violet-300">{completed}/{total}</span>
        </div>
        <button onClick={dismiss} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
          <X size={12} className="text-white/70" />
        </button>

        {/* progress bar */}
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
          <motion.div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
            initial={false} animate={{ width: `${(completed / total) * 100}%` }} />
        </div>

        {allDone ? (
          <p className="text-[12px] text-white/60 leading-relaxed">
            Tu as découvert toutes les fonctionnalités. Continue à t'entraîner chaque jour jusqu'aux examens !
          </p>
        ) : (
          <div className="space-y-1.5">
            {GOALS.map((g) => {
              const Icon = g.icon;
              const isDone = done[g.flag];
              return (
                <button
                  key={g.flag}
                  onClick={() => !isDone && navigate(g.to)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition ${isDone ? "opacity-55" : "bg-white/5 active:bg-white/10"}`}
                >
                  {isDone
                    ? <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                    : <Circle size={18} className="text-white/30 flex-shrink-0" />}
                  <Icon size={15} className={isDone ? "text-white/40" : "text-violet-300"} />
                  <span className={`text-[13px] font-semibold flex-1 ${isDone ? "line-through text-white/40" : "text-white"}`}>
                    {g.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
