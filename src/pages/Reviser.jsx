// src/pages/Reviser.jsx — v22-fix
// Toned-down: white cards with small accent icons. No more big saturated gradients.

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Calendar, Lock, Crown, ChevronRight, FileText,
  GraduationCap,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { useUsage } from "../hooks/useUsage";
import { WEEKLY_QUIZZES, getExamsByYear, isExamLocked, QUIZ_FORMATS } from "../utils/reviserData";

const FORMAT_ACCENTS = {
  multiple_choice: "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400",
  flashcards:      "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-500",
  schema:          "bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
  fill_blank:      "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  matching:        "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export default function Reviser() {
  const navigate = useNavigate();
  const { track } = useApp();
  const { planTier } = useUsage();

  const examsByYear = getExamsByYear();
  const weeklyForTrack = WEEKLY_QUIZZES;

  return (
    <div className="pb-28 pt-2">
      <header className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap size={22} className="text-violet-600 dark:text-violet-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Réviser</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Quiz hebdomadaires et examens passés
        </p>
      </header>

      {/* Weekly quizzes */}
      <section className="px-4 mt-5">
        <div className="flex items-center gap-2 mb-2.5 px-1">
          <Sparkles size={14} className="text-amber-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Quiz de la semaine</h2>
        </div>
        <div className="space-y-2">
          {weeklyForTrack.map((q, i) => {
            const fmt = QUIZ_FORMATS.find((f) => f.id === q.format) || QUIZ_FORMATS[0];
            const accent = FORMAT_ACCENTS[q.format] || FORMAT_ACCENTS.multiple_choice;
            return (
              <motion.button
                key={q.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/reviser/quiz/${q.id}`)}
                className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center gap-3 text-left ring-1 ring-slate-100 dark:ring-slate-700"
              >
                <div className={`w-11 h-11 rounded-xl ${accent} flex items-center justify-center text-xl flex-shrink-0`}>
                  {fmt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{q.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {fmt.label} · {q.questionCount} questions · {q.duration}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Past exams */}
      <section className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-2.5 px-1">
          <Calendar size={14} className="text-violet-600 dark:text-violet-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Examens passés</h2>
        </div>

        <div className="space-y-4">
          {examsByYear.map(({ year, exams }, yi) => {
            const tracked = exams.filter((e) => e.track === (track || "NS4"));
            if (tracked.length === 0) return null;
            const yearLocked = tracked.every((e) => e.premium);
            return (
              <motion.div
                key={year}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: yi * 0.03 }}
              >
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 px-1 flex items-center gap-1.5">
                  <span>{year}</span>
                  {yearLocked && <Lock size={11} className="text-amber-500" />}
                </h3>
                <div className="grid grid-cols-2 gap-2">
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
                        className={`relative p-3 rounded-xl text-left ring-1 ${
                          locked
                            ? "bg-slate-50 dark:bg-slate-800/50 ring-amber-200 dark:ring-amber-700/40"
                            : "bg-white dark:bg-slate-800 shadow-sm ring-slate-100 dark:ring-slate-700"
                        }`}
                      >
                        {locked && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                            <Crown size={10} className="text-amber-600 dark:text-amber-400" />
                          </div>
                        )}
                        <FileText size={16} className="text-violet-500 mb-1.5" />
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {exam.track === "9AF" ? "9ème AF" : "NS4"}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
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
      </section>

      {/* Premium upsell — only for free users */}
      {planTier !== "premium" && planTier !== "basic" && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/paywall")}
          className="mx-4 mt-6 w-[calc(100%-2rem)] p-4 rounded-2xl bg-white dark:bg-slate-800 ring-1 ring-amber-200 dark:ring-amber-700/40 shadow-sm flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Crown size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-slate-900 dark:text-white">Débloque les 5 dernières années</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Accès complet aux examens 2021-2026</div>
          </div>
          <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
        </motion.button>
      )}
    </div>
  );
}
