// src/pages/Cours.jsx — v22-fix
// Toned-down design: white cards with subtle accent colors instead of full-bleed gradients.
// Cleaner spacing, easier to scan, less visual noise.

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";
import { SUBJECTS } from "../utils/coursData";
import { useApp } from "../contexts/AppContext";

// Subtle accent colors — used for the small icon tile, not the whole card
const ACCENT_TILES = {
  math: "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400",
  physique: "bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
  chimie: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  biologie: "bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400",
  francais: "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400",
  sciences_sociales: "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-500",
  kreyol: "bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400",
};

export default function Cours() {
  const navigate = useNavigate();
  const { track } = useApp();
  const visibleSubjects = SUBJECTS.filter(
    (s) => !s.tracks || s.tracks.includes(track || "NS4")
  );

  return (
    <div className="pb-28 pt-2">
      <header className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={22} className="text-violet-600 dark:text-violet-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cours</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tes matières — chapitres, leçons et quiz
        </p>
      </header>

      <main className="px-4 mt-4 space-y-2.5">
        {visibleSubjects.map((subject, i) => {
          const accent = ACCENT_TILES[subject.id] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
          return (
            <motion.button
              key={subject.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/cours/${subject.id}`)}
              className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 flex items-center gap-3 text-left"
            >
              <div className={`w-11 h-11 rounded-xl ${accent} flex items-center justify-center text-xl flex-shrink-0`}>
                {subject.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 dark:text-white text-sm">{subject.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {subject.tracks?.includes("9AF") && subject.tracks?.includes("NS4")
                    ? "9ème AF + NS4"
                    : subject.tracks?.[0] === "9AF"
                    ? "9ème AF"
                    : "NS4"}
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
            </motion.button>
          );
        })}
      </main>
    </div>
  );
}
