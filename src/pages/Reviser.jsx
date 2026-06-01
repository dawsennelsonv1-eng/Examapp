// src/pages/Reviser.jsx — v23
// Duolingo-inspired layout:
//   - Top: segmented toggle [Quiz (default)] [Examens]
//   - Quiz view: vertical lesson-tree style with circular nodes
//   - Examens view: clean year-by-year grid
//   - Locked content has a soft amber crown badge, not aggressive

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Check, Lock, Crown, Star, Calendar, FileText,
  ChevronRight, Sparkles, Zap,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { useUsage } from "../hooks/useUsage";
import { WEEKLY_QUIZZES, getExamsByYear, isExamLocked, QUIZ_FORMATS } from "../utils/reviserData";

export default function Reviser() {
  const [mode, setMode] = useState("quiz"); // quiz | examens
  const { planTier } = useUsage();

  return (
    <div className="pb-28 pt-3 min-h-screen bg-slate-950">
      {/* Segmented toggle */}
      <div className="px-4 mb-4">
        <div className="relative grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-900 ring-1 ring-slate-800">
          {/* Slider */}
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 shadow-lg shadow-violet-500/30"
            style={{ left: mode === "quiz" ? 4 : "calc(50% + 0px)" }}
          />
          <button
            onClick={() => setMode("quiz")}
            className={`relative z-10 py-2.5 rounded-xl text-sm font-bold transition-colors ${mode === "quiz" ? "text-white" : "text-slate-400"}`}
          >
            Quiz
          </button>
          <button
            onClick={() => setMode("examens")}
            className={`relative z-10 py-2.5 rounded-xl text-sm font-bold transition-colors ${mode === "examens" ? "text-white" : "text-slate-400"}`}
          >
            Examens
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "quiz" ? (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <QuizView planTier={planTier} />
          </motion.div>
        ) : (
          <motion.div
            key="examens"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <ExamsView planTier={planTier} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===================== QUIZ VIEW (Duolingo style) =====================
function QuizView({ planTier }) {
  const navigate = useNavigate();
  // Mock progress per quiz — would come from Supabase later
  const completed = new Set(); // none completed yet

  return (
    <div className="px-4">
      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 p-5 mb-5 shadow-xl shadow-violet-500/20"
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-amber-300" />
          <span className="text-[10px] uppercase tracking-widest font-black text-white/70">Quiz hebdomadaire</span>
        </div>
        <h2 className="text-xl font-black text-white mb-1">Continue ta série</h2>
        <p className="text-xs text-white/80">
          {WEEKLY_QUIZZES.length} quiz cette semaine · niveau adapté à toi
        </p>
      </motion.div>

      {/* Lesson tree — vertical path with alternating offset */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-800 via-slate-800 to-transparent -translate-x-1/2 -z-10 rounded-full" />

        <div className="space-y-3">
          {WEEKLY_QUIZZES.map((q, i) => {
            const isDone = completed.has(q.id);
            const isLocked = false; // weekly quizzes always accessible
            const offset = i % 2 === 0 ? 0 : 40; // alternate left/right for visual interest
            const fmt = QUIZ_FORMATS.find((f) => f.id === q.format) || QUIZ_FORMATS[0];
            return (
              <QuizNode
                key={q.id}
                quiz={q}
                format={fmt}
                isDone={isDone}
                isLocked={isLocked}
                offset={offset}
                delay={i * 0.06}
                onTap={() => navigate(`/reviser/quiz/${q.id}`)}
              />
            );
          })}
        </div>
      </div>

      {/* Encouragement footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 p-4 rounded-2xl bg-slate-900 ring-1 ring-slate-800 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Zap size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-white">Plus de quiz bientôt</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Nouveaux quiz chaque lundi</div>
        </div>
      </motion.div>
    </div>
  );
}

function QuizNode({ quiz, format, isDone, isLocked, offset, delay, onTap }) {
  // Node style: large circular button with icon + halo
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ marginLeft: offset, marginRight: -offset }}
      className="flex items-center gap-3"
    >
      {/* Node circle */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={isLocked ? undefined : onTap}
        disabled={isLocked}
        className="relative flex-shrink-0"
      >
        {/* Halo */}
        {!isDone && !isLocked && (
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-violet-500/40 blur-md"
          />
        )}
        <div
          className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl ring-4 ${
            isDone
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 ring-emerald-300/30"
              : isLocked
              ? "bg-slate-800 ring-slate-700/50"
              : "bg-gradient-to-br from-violet-500 to-indigo-700 ring-violet-400/30"
          }`}
        >
          <span className="text-3xl">{isDone ? "✓" : isLocked ? "🔒" : format.icon}</span>
        </div>
        {/* Stars at bottom (Duolingo-style score indicator) */}
        {isDone && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded-full ring-2 ring-slate-950">
            {[1, 2, 3].map((s) => (
              <Star key={s} size={8} className="text-amber-400 fill-amber-400" />
            ))}
          </div>
        )}
      </motion.button>

      {/* Right side: quiz info */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-black text-violet-400 mb-0.5">
          {format.label}
        </div>
        <div className="font-bold text-sm text-white leading-tight">
          {quiz.title.replace(" — Quiz hebdomadaire", "")}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {quiz.questionCount} questions · {quiz.duration}
        </div>
      </div>
    </motion.div>
  );
}

// ===================== EXAMS VIEW =====================
function ExamsView({ planTier }) {
  const navigate = useNavigate();
  const { track } = useApp();
  const examsByYear = getExamsByYear();

  return (
    <div className="px-4">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Calendar size={14} className="text-violet-400" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Examens des années précédentes
        </h2>
      </div>

      <div className="space-y-5">
        {examsByYear.map(({ year, exams }, yi) => {
          const tracked = exams.filter((e) => e.track === (track || "NS4"));
          if (tracked.length === 0) return null;
          const yearLocked = tracked.every((e) => e.premium);
          return (
            <motion.div
              key={year}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: yi * 0.04 }}
            >
              <div className="flex items-baseline justify-between mb-2 px-1">
                <h3 className="text-lg font-black text-white">{year}</h3>
                {yearLocked && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Lock size={9} />Premium
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {tracked.map((exam) => {
                  const locked = isExamLocked(exam, planTier);
                  return (
                    <motion.button
                      key={`${exam.year}_${exam.track}`}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (locked) navigate("/paywall");
                        else navigate(`/reviser/exam/${exam.year}/${exam.track}`);
                      }}
                      className="relative p-4 rounded-2xl bg-slate-900 text-left ring-1 ring-slate-800"
                    >
                      {locked && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Crown size={12} className="text-amber-400" />
                        </div>
                      )}
                      <FileText size={20} className="text-violet-400 mb-2" />
                      <div className="font-black text-sm text-white">
                        {exam.track === "9AF" ? "9ème AF" : "NS4"}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {exam.subjects.length} matières
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Premium upsell */}
      {planTier !== "premium" && planTier !== "basic" && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/paywall")}
          className="mt-6 w-full p-4 rounded-2xl bg-slate-900 ring-1 ring-amber-700/30 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Crown size={18} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-white">Débloque toutes les années</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Accès complet 2021-2026</div>
          </div>
          <ChevronRight size={16} className="text-slate-500" />
        </motion.button>
      )}
    </div>
  );
}
