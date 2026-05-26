// src/components/shared/FirstLaunchTutorial.jsx
// Brief 4-step tutorial after onboarding completes.
// Shows once, then dismissed forever.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Scan, Sparkles, BookOpen, X } from "lucide-react";

const STORAGE_KEY = "laureat.tutorialSeen";

const STEPS = [
  {
    icon: Scan,
    color: "from-violet-500 to-indigo-700",
    title: "Scanne un exercice",
    body: "Prends une photo de n'importe quel exercice MENFP. Le prof te le résout en quelques secondes dans le format haïtien.",
    location: "top",
  },
  {
    icon: Sparkles,
    color: "from-amber-400 to-orange-600",
    title: "Le prof t'explique",
    body: "Si tu ne comprends pas, tape \"Explique-moi\". Le prof devient interactif: tableau, voix, étape par étape.",
    location: "middle",
  },
  {
    icon: BookOpen,
    color: "from-emerald-500 to-teal-600",
    title: "Quiz d'examens passés",
    body: "Entraîne-toi sur des questions inspirées des examens MENFP des 3 dernières années.",
    location: "bottom",
  },
];

export default function FirstLaunchTutorial() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Delay 600ms so home renders first
        setTimeout(() => setShow(true), 800);
      }
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setShow(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!show) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={dismiss}
      >
        <motion.div
          key={step}
          initial={{ y: 30, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl"
        >
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
          >
            <X size={14} className="text-slate-500" />
          </button>

          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center mb-5 mt-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-8 bg-violet-500" :
                  i < step ? "w-2 bg-violet-300" :
                  "w-2 bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>

          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-lg`}>
            <Icon size={28} className="text-white" />
          </div>

          <h2 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
            {current.title}
          </h2>
          <p className="text-sm text-center text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            {current.body}
          </p>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm"
              >
                Retour
              </button>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={next}
              className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-md"
            >
              {step < STEPS.length - 1 ? "Suivant" : "C'est parti"}
              <ChevronRight size={14} />
            </motion.button>
          </div>

          {step < STEPS.length - 1 && (
            <button
              onClick={dismiss}
              className="block mx-auto mt-3 text-xs text-slate-500 hover:text-slate-700"
            >
              Passer
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
