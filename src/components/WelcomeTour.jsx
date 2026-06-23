// src/components/WelcomeTour.jsx
// First-login walkthrough: a few friendly slides showing what the app does and
// why it helps. Shown once (after onboarding). French. Mount once near the root.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../contexts/AppContext";
import { ScanLine, GraduationCap, ListChecks, BookOpen, Sparkles, ChevronRight, X } from "lucide-react";

const TOUR_KEY = "laureat.tourDone";

const SLIDES = [
  {
    icon: Sparkles, color: "from-violet-500 to-indigo-700",
    title: "Bienvenue sur Laureat AI 🎓",
    text: "Ton prof particulier dans ta poche. Voici tout ce que tu peux faire pour réussir ton examen national.",
  },
  {
    icon: ScanLine, color: "from-blue-500 to-cyan-600",
    title: "Scanne n'importe quel exercice",
    text: "Prends en photo un exercice difficile. L'app te montre la solution étape par étape — comme un prof à côté de toi.",
  },
  {
    icon: GraduationCap, color: "from-emerald-500 to-teal-600",
    title: "Parle avec le prof",
    text: "Bloqué sur un sujet ? Discute avec ton prof IA, pose tes questions, et comprends à ton rythme.",
  },
  {
    icon: ListChecks, color: "from-amber-500 to-orange-600",
    title: "Entraîne-toi avec des quiz",
    text: "Des quiz par matière, du plus facile au plus difficile. Tu vois tes progrès et tu combles tes lacunes.",
  },
  {
    icon: BookOpen, color: "from-rose-500 to-pink-600",
    title: "Cours & anciens examens",
    text: "Révise les leçons clés et entraîne-toi sur les vrais examens des années passées. Tout est là.",
  },
];

export default function WelcomeTour() {
  const { onboardingComplete } = useApp();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(() => {
    try { return !localStorage.getItem(TOUR_KEY); } catch { return true; }
  });

  if (!onboardingComplete || !open) return null;

  const finish = () => {
    try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
    setOpen(false);
  };
  const next = () => (i < SLIDES.length - 1 ? setI(i + 1) : finish());

  const s = SLIDES[i];
  const Icon = s.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          key={i}
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm rounded-3xl bg-slate-900 ring-1 ring-white/10 p-6 text-white relative"
        >
          <button onClick={finish} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X size={16} />
          </button>

          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4`}>
            <Icon size={30} className="text-white" />
          </div>
          <h2 className="text-xl font-black mb-2">{s.title}</h2>
          <p className="text-sm text-white/70 leading-relaxed">{s.text}</p>

          {/* dots */}
          <div className="flex gap-1.5 mt-5 mb-4">
            {SLIDES.map((_, k) => (
              <div key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-violet-400" : "w-1.5 bg-white/20"}`} />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={finish} className="text-sm font-bold text-white/50">Passer</button>
            <button onClick={next}
              className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-indigo-700 text-white font-black text-sm px-5 py-2.5 rounded-xl">
              {i < SLIDES.length - 1 ? "Suivant" : "Commencer"} <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
