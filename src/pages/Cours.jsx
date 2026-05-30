// src/pages/Cours.jsx v20
// LANDING: grid of subject banners. Tap one → /cours/:subjectId for chapters.

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";
import { SUBJECTS } from "../utils/coursData";
import { useApp } from "../contexts/AppContext";

export default function Cours() {
  const navigate = useNavigate();
  const { track } = useApp();

  // Filter subjects by user's track
  const visibleSubjects = SUBJECTS.filter((s) => !s.tracks || s.tracks.includes(track || "NS4"));

  return (
    <div className="pb-28">
      <header className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={24} className="text-violet-600 dark:text-violet-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cours</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tes matières — chapitres, leçons et quiz
        </p>
      </header>

      <main className="px-4 mt-4 space-y-3">
        {visibleSubjects.map((subject, i) => (
          <motion.button
            key={subject.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/cours/${subject.id}`)}
            className="w-full relative rounded-2xl overflow-hidden shadow-lg text-left"
            style={{ background: subject.banner }}
          >
            <div className="relative px-5 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{subject.icon}</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-black opacity-80">Matière</div>
                    <div className="text-lg font-black">{subject.name}</div>
                  </div>
                </div>
                <ChevronRight size={24} className="opacity-80" />
              </div>
            </div>

            {/* Subtle decorative orbs */}
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/10 blur-xl pointer-events-none" />
          </motion.button>
        ))}
      </main>
    </div>
  );
}
