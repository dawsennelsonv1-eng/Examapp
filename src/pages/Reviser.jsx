// src/pages/Reviser.jsx — v24
// Past exams ONLY. The quiz tree moved to the dedicated Quiz tab, so this page
// is now a clean year-by-year archive of past national exams.

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Lock, Crown, Calendar, FileText, ChevronRight } from "lucide-react";
import { useEffectivePlan, useEffectiveTrack } from "../hooks/useAdminAccess";
import { getExamsByYear, isExamLocked } from "../utils/reviserData";

export default function Reviser() {
  const navigate = useNavigate();
  const planTier = useEffectivePlan(); // admin preview-aware
  const track = useEffectiveTrack();
  const examsByYear = getExamsByYear();

  return (
    <div className="pb-28 pt-3 min-h-screen bg-slate-950">
      {/* Header */}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={20} className="text-violet-400" />
          <h1 className="text-2xl font-black text-white">Anciens examens</h1>
        </div>
        <p className="text-sm text-slate-400">Les sujets des années précédentes, classés par année</p>
      </div>

      <div className="px-4 space-y-5">
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
          className="mt-6 mx-4 w-[calc(100%-2rem)] p-4 rounded-2xl bg-slate-900 ring-1 ring-amber-700/30 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Crown size={18} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-white">Débloque toutes les années</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Accès complet aux examens premium</div>
          </div>
          <ChevronRight size={16} className="text-slate-500" />
        </motion.button>
      )}
    </div>
  );
}
