// src/pages/Reviser.jsx v20
// NEW Reviser hub: weekly quizzes + past exams by year + paid-tier locks.
// (The OLD Reviser content is now in Cours.jsx.)

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Calendar, Lock, Crown, ChevronRight,
  FileText, GraduationCap,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { useUsage } from "../hooks/useUsage";
import { WEEKLY_QUIZZES, getExamsByYear, isExamLocked, QUIZ_FORMATS } from "../utils/reviserData";

export default function Reviser() {
  const navigate = useNavigate();
  const { track } = useApp();
  const { planTier } = useUsage();

  const examsByYear = getExamsByYear();
  const weeklyForTrack = WEEKLY_QUIZZES; // could filter by track later

  return (
    <div className="pb-28">
      <header className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap size={24} className="text-violet-600 dark:text-violet-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Réviser</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Quiz hebdomadaires + examens des années précédentes
        </p>
      </header>

      {/* Weekly admin quizzes */}
      <section className="px-4 mt-5">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Sparkles size={14} className="text-amber-500" />
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Quiz de la semaine</h2>
        </div>
        <div className="space-y-2.5">
          {weeklyForTrack.map((q, i) => {
            const fmt = QUIZ_FORMATS.find((f) => f.id === q.format) || QUIZ_FORMATS[0];
            return (
              <motion.button
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/reviser/quiz/${q.id}`)}
                className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center gap-3 text-left ring-1 ring-slate-100 dark:ring-slate-700"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${fmt.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                  <span className="text-xl">{fmt.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{q.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {fmt.label} · {q.questionCount} questions · {q.duration}
                  </div>
                  <div className="text-[10px] text-violet-600 dark:text-violet-400 mt-0.5">
                    Réf: {q.referencedExam.year} {q.referencedExam.track} ({q.referencedExam.exercise})
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Past exams by year */}
      <section className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Calendar size={14} className="text-violet-600 dark:text-violet-400" />
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Examens passés</h2>
        </div>

        <div className="space-y-4">
          {examsByYear.map(({ year, exams }, yi) => (
            <motion.div
              key={year}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: yi * 0.04 }}
            >
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2 px-1 flex items-center gap-2">
                <span>{year}</span>
                {exams.every((e) => e.premium) && (
                  <Lock size={11} className="text-amber-500" />
                )}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {exams
                  .filter((e) => e.track === (track || "NS4"))
                  .map((exam, i) => {
                    const locked = isExamLocked(exam, planTier);
                    return (
                      <motion.button
                        key={`${exam.year}_${exam.track}`}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          if (locked) navigate("/paywall");
                          else navigate(`/reviser/exam/${exam.year}/${exam.track}`);
                        }}
                        className={`relative p-3 rounded-xl text-left ${
                          locked
                            ? "bg-slate-100 dark:bg-slate-800 ring-1 ring-amber-300 dark:ring-amber-700/40"
                            : "bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700"
                        }`}
                      >
                        {locked && (
                          <div className="absolute top-2 right-2">
                            <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                              <Crown size={11} className="text-amber-600 dark:text-amber-400" />
                            </div>
                          </div>
                        )}
                        <FileText size={18} className="text-violet-500 mb-1.5" />
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {exam.track === "9AF" ? "9ème AF" : "NS4"}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {exam.subjects.length} matières
                        </div>
                        {locked && (
                          <div className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mt-1.5">
                            Premium
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Premium upsell footer */}
      {planTier !== "premium" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-6 p-4 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 text-white shadow-lg"
        >
          <div className="flex items-center gap-3">
            <Crown size={24} className="flex-shrink-0" />
            <div className="flex-1">
              <div className="font-black text-sm">Débloque les 5 dernières années</div>
              <div className="text-[11px] opacity-90 mt-0.5">Accès complet aux examens 2021-2026</div>
            </div>
            <button onClick={() => navigate("/paywall")}
              className="px-3 py-1.5 rounded-lg bg-white text-amber-700 text-xs font-bold flex-shrink-0">
              Premium
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
