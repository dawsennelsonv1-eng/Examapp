// src/pages/Cours.jsx — v24
// Lists ONLY subjects that have a PUBLISHED course_tree for the current
// (effective) track. AI-built courses, straight from the database.

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Calculator, Atom, FlaskConical, Brain, Globe2,
  Languages, BookOpen as BookIcon, GraduationCap, Loader2,
} from "lucide-react";
import { useEffectiveTrack } from "../hooks/useAdminAccess";
import { usePublishedSubjects } from "../hooks/useCourseTree";

const SUBJECT_VISUALS = {
  math: { icon: Calculator, tile: "from-violet-500 to-indigo-700" },
  mathematiques: { icon: Calculator, tile: "from-violet-500 to-indigo-700" },
  physique: { icon: Atom, tile: "from-blue-500 to-cyan-600" },
  chimie: { icon: FlaskConical, tile: "from-emerald-500 to-teal-600" },
  biologie: { icon: Brain, tile: "from-rose-500 to-pink-600" },
  francais: { icon: BookIcon, tile: "from-fuchsia-500 to-pink-600" },
  sciences_sociales: { icon: Globe2, tile: "from-amber-500 to-orange-600" },
  philosophie: { icon: GraduationCap, tile: "from-slate-500 to-slate-700" },
  kreyol: { icon: Languages, tile: "from-red-500 to-rose-600" },
  creole: { icon: Languages, tile: "from-red-500 to-rose-600" },
};

export default function Cours() {
  const navigate = useNavigate();
  const track = useEffectiveTrack();
  const { subjects, loading } = usePublishedSubjects(track || "NS4");

  if (loading) {
    return (
      <div className="pb-28 pt-20 flex flex-col items-center justify-center text-center">
        <Loader2 size={28} className="animate-spin text-violet-500 mb-2" />
        <div className="text-sm text-slate-400">Chargement des cours…</div>
      </div>
    );
  }

  if (!subjects.length) {
    return (
      <div className="pb-28 pt-20 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/15 flex items-center justify-center mx-auto mb-4">
          <GraduationCap size={30} className="text-violet-400" />
        </div>
        <h2 className="text-lg font-black text-white mb-1">Les cours arrivent bientôt</h2>
        <p className="text-sm text-slate-400">
          Aucun cours publié pour le {track === "9AF" ? "9ème AF" : "NS4"} pour l'instant.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-28 pt-2">
      <div className="px-3 pt-3 grid grid-cols-2 gap-3">
        {subjects.map((s, i) => {
          const visual = SUBJECT_VISUALS[s.subject] || { icon: BookIcon, tile: "from-slate-500 to-slate-700" };
          const Icon = visual.icon;
          return (
            <motion.button
              key={s.subject}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/cours/${s.subject}`)}
              className="relative bg-slate-900 rounded-2xl p-4 text-left ring-1 ring-slate-800/50"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${visual.tile} flex items-center justify-center shadow-md mb-4`}>
                <Icon size={26} className="text-white" strokeWidth={2.25} />
              </div>
              <div className="font-black text-white text-base mb-1">
                {s.subject_name || s.subject}
              </div>
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
