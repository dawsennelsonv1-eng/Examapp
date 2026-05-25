// src/pages/Reviser.jsx
// Subject-based review. Each subject opens a Classroom session focused on that topic.

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Calculator, FlaskConical, Atom, Globe,
  PenTool, Brain, Languages, ChevronRight,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { useClassroomSessions } from "../hooks/useClassroom";
import { SUBJECTS_BY_TRACK } from "../utils/constants";

const SUBJECT_ICONS = {
  "Mathématiques": { icon: Calculator, color: "from-violet-500 to-indigo-700" },
  "Physique": { icon: Atom, color: "from-blue-500 to-cyan-600" },
  "Chimie": { icon: FlaskConical, color: "from-emerald-500 to-teal-600" },
  "Biologie": { icon: Brain, color: "from-pink-500 to-rose-600" },
  "Sciences Sociales": { icon: Globe, color: "from-amber-500 to-orange-600" },
  "Philosophie": { icon: PenTool, color: "from-slate-600 to-slate-800" },
  "Français": { icon: Languages, color: "from-red-500 to-rose-600" },
  "Créole": { icon: Languages, color: "from-cyan-500 to-blue-600" },
};

export default function Reviser() {
  const navigate = useNavigate();
  const { track } = useApp();
  const { createSession } = useClassroomSessions();
  const subjects = SUBJECTS_BY_TRACK[track || "NS4"] || [];

  const startReview = (subject) => {
    const session = createSession({
      subject,
      title: `Révision ${subject}`,
    });
    navigate(`/classe?session=${session.id}`);
  };

  return (
    <div className="pb-28">
      <div className="px-4 py-6">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={24} className="text-violet-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Réviser</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choisis une matière, le prof t'aide à réviser
        </p>
      </div>

      <section className="px-4">
        <div className="grid grid-cols-2 gap-3">
          {subjects.map((subject, i) => {
            const config = SUBJECT_ICONS[subject] || { icon: BookOpen, color: "from-slate-500 to-slate-700" };
            const Icon = config.icon;
            return (
              <motion.button
                key={subject}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => startReview(subject)}
                className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-md text-left ring-1 ring-slate-100 dark:ring-slate-700"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-md mb-3`}>
                  <Icon size={22} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">
                  {subject}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  Commencer
                  <ChevronRight size={12} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="px-4 mt-8">
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-4 border border-violet-100 dark:border-violet-500/20">
          <h3 className="text-sm font-bold text-violet-900 dark:text-violet-200 mb-1">
            💡 Astuce
          </h3>
          <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
            Pour réviser efficacement: pose des questions précises au prof comme
            "Explique-moi le théorème de Pythagore avec un exemple haïtien" ou
            "Fais-moi un schéma du système solaire".
          </p>
        </div>
      </section>
    </div>
  );
}
