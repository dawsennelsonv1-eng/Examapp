// src/pages/Cours.jsx — v23
// Matches the screenshot you sent: dark cards in a 2-col grid, colored
// rounded-square icon tiles, subject name in white, "Commencer >" link below.

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Calculator, Atom, FlaskConical, Brain, Globe2,
  Languages, BookOpen as BookIcon, GraduationCap,
} from "lucide-react";
import { SUBJECTS } from "../utils/coursData";
import { subjectInTrack } from "../utils/trackConfig";
import { useApp } from "../contexts/AppContext";

// Icon + gradient tile color per subject
const SUBJECT_VISUALS = {
  math: { icon: Calculator, tile: "from-violet-500 to-indigo-700" },
  physique: { icon: Atom, tile: "from-blue-500 to-cyan-600" },
  chimie: { icon: FlaskConical, tile: "from-emerald-500 to-teal-600" },
  biologie: { icon: Brain, tile: "from-rose-500 to-pink-600" },
  francais: { icon: BookIcon, tile: "from-fuchsia-500 to-pink-600" },
  sciences_sociales: { icon: Globe2, tile: "from-amber-500 to-orange-600" },
  philosophie: { icon: GraduationCap, tile: "from-slate-500 to-slate-700" },
  kreyol: { icon: Languages, tile: "from-red-500 to-rose-600" },
};

export default function Cours() {
  const navigate = useNavigate();
  const { track } = useApp();
  const visibleSubjects = SUBJECTS.filter(
    (s) => subjectInTrack(s, track || "NS4")
  );

  return (
    <div className="pb-28 pt-2">
      <div className="px-3 pt-3 grid grid-cols-2 gap-3">
        {visibleSubjects.map((subject, i) => {
          const visual = SUBJECT_VISUALS[subject.id] || { icon: BookIcon, tile: "from-slate-500 to-slate-700" };
          const Icon = visual.icon;
          return (
            <motion.button
              key={subject.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/cours/${subject.id}`)}
              className="relative bg-slate-900 rounded-2xl p-4 text-left ring-1 ring-slate-800/50"
            >
              {/* Colored icon tile */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${visual.tile} flex items-center justify-center shadow-md mb-4`}>
                <Icon size={26} className="text-white" strokeWidth={2.25} />
              </div>

              {/* Subject name */}
              <div className="font-black text-white text-base mb-1">
                {subject.name}
              </div>

              {/* Commencer link */}
              <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
                <span>Commencer</span>
                <span>›</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
