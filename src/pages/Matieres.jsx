// src/pages/Matieres.jsx
// Library of study lessons across all subjects.
// Replaces the old Sciences Sociales tab.

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Calculator, Atom, FlaskConical, Dna, Landmark, Globe2,
  BookOpen, Languages, Brain, ChevronRight, X
} from "lucide-react";

const SUBJECTS = [
  { id: "math",     name: "Mathématiques",   icon: Calculator,    color: "from-blue-500 to-cyan-500",       lessons: 18 },
  { id: "physique", name: "Physique",        icon: Atom,          color: "from-violet-500 to-purple-500",   lessons: 14 },
  { id: "chimie",   name: "Chimie",          icon: FlaskConical,  color: "from-emerald-500 to-teal-500",    lessons: 12 },
  { id: "biologie", name: "Biologie",        icon: Dna,           color: "from-green-500 to-lime-500",      lessons: 10 },
  { id: "histoire", name: "Histoire d'Haïti",icon: Landmark,      color: "from-amber-500 to-orange-500",    lessons: 22 },
  { id: "geo",      name: "Géographie",      icon: Globe2,        color: "from-sky-500 to-blue-500",        lessons: 9 },
  { id: "francais", name: "Français",        icon: BookOpen,      color: "from-rose-500 to-pink-500",       lessons: 16 },
  { id: "creole",   name: "Créole",          icon: Languages,     color: "from-red-500 to-rose-500",        lessons: 8 },
  { id: "philo",    name: "Philosophie",     icon: Brain,         color: "from-indigo-500 to-violet-500",   lessons: 11 },
];

// Mock lessons for a subject — real content comes later
const MOCK_LESSONS = {
  physique: [
    { id: 1, title: "Les forces et le mouvement", duration: "15 min", level: "Débutant" },
    { id: 2, title: "Énergie cinétique et potentielle", duration: "20 min", level: "Intermédiaire" },
    { id: 3, title: "Ondes et vibrations", duration: "18 min", level: "Avancé" },
  ],
  histoire: [
    { id: 1, title: "L'indépendance d'Haïti (1804)", duration: "25 min", level: "Essentiel" },
    { id: 2, title: "L'occupation américaine (1915-1934)", duration: "20 min", level: "Important" },
    { id: 3, title: "L'ère des Duvalier", duration: "22 min", level: "Important" },
  ],
};

function getLessonsFor(subjectId) {
  return MOCK_LESSONS[subjectId] || [
    { id: 1, title: "Introduction", duration: "10 min", level: "Débutant" },
    { id: 2, title: "Concepts de base", duration: "15 min", level: "Débutant" },
    { id: 3, title: "Exercices pratiques", duration: "20 min", level: "Intermédiaire" },
  ];
}

export default function Matieres() {
  const [selectedSubject, setSelectedSubject] = useState(null);

  return (
    <div className="pb-28">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Matières
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Bibliothèque complète de leçons
        </p>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {SUBJECTS.map((subject, i) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            delay={i * 0.04}
            onClick={() => setSelectedSubject(subject)}
          />
        ))}
      </div>

      {/* Subject detail modal */}
      {selectedSubject && (
        <SubjectDetail
          subject={selectedSubject}
          onClose={() => setSelectedSubject(null)}
        />
      )}
    </div>
  );
}

function SubjectCard({ subject, delay, onClick }) {
  const Icon = subject.icon;
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="relative rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm text-left overflow-hidden"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center mb-3 shadow-lg`}>
        <Icon size={22} className="text-white" strokeWidth={2} />
      </div>
      <div className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">
        {subject.name}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {subject.lessons} leçons
      </div>
    </motion.button>
  );
}

function SubjectDetail({ subject, onClose }) {
  const Icon = subject.icon;
  const lessons = getLessonsFor(subject.id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
      >
        <div className={`bg-gradient-to-br ${subject.color} p-6 text-white`}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon size={28} className="text-white" />
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
          <h2 className="text-2xl font-bold mb-1">{subject.name}</h2>
          <p className="text-sm text-white/80">{subject.lessons} leçons disponibles</p>
        </div>

        <div className="p-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-2">
            Leçons recommandées
          </h3>
          {lessons.map((lesson, i) => (
            <motion.button
              key={lesson.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-sm font-bold text-violet-600">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                  {lesson.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {lesson.duration} · {lesson.level}
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </motion.button>
          ))}
          <div className="text-center text-xs text-slate-400 py-4">
            Plus de leçons bientôt disponibles
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
