// src/pages/Onboarding.jsx
// Fixed: track step uses single-select (radio behavior). Picking one CLEARS the other.
// The "Continuer" button enables the moment a track is selected.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BookOpen, GraduationCap, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { PERSONALITIES, LANGUAGE_OPTIONS, STORAGE_KEYS } from "../utils/constants";

const TOTAL_STEPS = 4;

export default function Onboarding() {
  const navigate = useNavigate();
  const { setTrack, setPreferences, setOnboardingComplete } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [selectedTrack, setSelectedTrack] = useState(null);          // single value, not array
  const [selectedPersonality, setSelectedPersonality] = useState("joseph");
  const [selectedLanguage, setSelectedLanguage] = useState("fr");

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    try {
      if (setTrack) setTrack(selectedTrack);
      if (setPreferences) {
        setPreferences({
          name: name.trim() || "Élève",
          personality: selectedPersonality,
          language: selectedLanguage,
        });
      }
      if (setOnboardingComplete) setOnboardingComplete(true);
      else localStorage.setItem(STORAGE_KEYS.ONBOARDING, "1");
    } catch (err) {
      console.warn("Onboarding save failed:", err);
    }
    navigate("/", { replace: true });
  };

  // Can we proceed from the current step?
  const canProceed =
    (step === 0 && name.trim().length >= 2) ||
    (step === 1 && Boolean(selectedTrack)) ||
    (step === 2 && Boolean(selectedPersonality)) ||
    (step === 3 && Boolean(selectedLanguage));

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-indigo-900 text-white flex flex-col">
      {/* Progress dots */}
      <div className="pt-6 pb-2">
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === step ? 32 : 16,
                opacity: i <= step ? 1 : 0.3,
              }}
              className="h-1.5 rounded-full bg-white"
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 px-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepName key="0" name={name} onChange={setName} />
          )}
          {step === 1 && (
            <StepTrack
              key="1"
              name={name}
              selected={selectedTrack}
              onSelect={setSelectedTrack}
            />
          )}
          {step === 2 && (
            <StepPersonality
              key="2"
              selected={selectedPersonality}
              onSelect={setSelectedPersonality}
            />
          )}
          {step === 3 && (
            <StepLanguage
              key="3"
              selected={selectedLanguage}
              onSelect={setSelectedLanguage}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom nav */}
      <div className="px-6 pb-8 pt-4 space-y-2">
        {step < TOTAL_STEPS - 1 ? (
          <motion.button
            whileTap={canProceed ? { scale: 0.97 } : {}}
            onClick={next}
            disabled={!canProceed}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors ${
              canProceed
                ? "bg-white text-violet-900 shadow-xl"
                : "bg-white/20 text-white/50 cursor-not-allowed"
            }`}
          >
            Continuer <ArrowRight size={18} />
          </motion.button>
        ) : (
          <motion.button
            whileTap={canProceed ? { scale: 0.97 } : {}}
            onClick={finish}
            disabled={!canProceed}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors ${
              canProceed
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-xl"
                : "bg-white/20 text-white/50 cursor-not-allowed"
            }`}
          >
            <Sparkles size={18} />Commencer
          </motion.button>
        )}

        {step > 0 && (
          <button
            onClick={back}
            className="w-full py-2 text-white/70 text-sm font-semibold flex items-center justify-center gap-1"
          >
            <ArrowLeft size={14} />Retour
          </button>
        )}
      </div>
    </div>
  );
}

// =================== STEP 1: NAME ===================
function StepName({ name, onChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center mb-6 shadow-2xl shadow-violet-500/40"
      >
        <Sparkles size={36} />
      </motion.div>
      <h1 className="text-3xl font-black mb-2">Bienvenue !</h1>
      <p className="text-base text-white/80 mb-8">Comment tu t'appelles ?</p>
      <input
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ton prénom"
        autoFocus
        className="w-full px-5 py-4 rounded-2xl bg-white/15 backdrop-blur-md text-white text-lg font-bold text-center placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </motion.div>
  );
}

// =================== STEP 2: TRACK (single select — the buggy one, now fixed) ===================
function StepTrack({ name, selected, onSelect }) {
  const tracks = [
    {
      id: "9AF",
      label: "9ème AF",
      subtitle: "Fin du cycle fondamental",
      icon: "📘",
    },
    {
      id: "NS4",
      label: "Nouveau Secondaire IV",
      subtitle: "Le bac haïtien",
      icon: "🎓",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center mb-6 shadow-2xl shadow-violet-500/40"
      >
        <GraduationCap size={36} />
      </motion.div>
      <h1 className="text-3xl font-black mb-2">
        Enchanté {name || "ami"} !
      </h1>
      <p className="text-base text-white/80 mb-8">Pour quel examen tu te prépares ?</p>

      <div className="space-y-3">
        {tracks.map((track) => {
          const isSelected = selected === track.id;
          return (
            <motion.button
              key={track.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(track.id)}
              className={`w-full p-4 rounded-2xl bg-white text-left flex items-center gap-3 transition-all ${
                isSelected
                  ? "ring-4 ring-amber-400 shadow-2xl shadow-amber-500/30"
                  : "ring-2 ring-transparent opacity-90"
              }`}
            >
              <span className="text-3xl">{track.icon}</span>
              <div className="flex-1">
                <div className="font-black text-slate-900 text-base">{track.label}</div>
                <div className="text-xs text-slate-600">{track.subtitle}</div>
              </div>
              <motion.div
                animate={{
                  scale: isSelected ? 1 : 0,
                  opacity: isSelected ? 1 : 0,
                }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center flex-shrink-0"
              >
                <Check size={16} className="text-white" strokeWidth={3} />
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// =================== STEP 3: PERSONALITY ===================
function StepPersonality({ selected, onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-2xl shadow-orange-500/40"
      >
        <BookOpen size={36} />
      </motion.div>
      <h1 className="text-2xl font-black mb-2">Choisis ton prof</h1>
      <p className="text-sm text-white/80 mb-6">Tu peux changer plus tard</p>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {PERSONALITIES.map((p) => {
          const isSelected = selected === p.id;
          return (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(p.id)}
              className={`w-full p-3 rounded-2xl bg-white text-left flex items-center gap-3 transition-all ${
                isSelected
                  ? "ring-4 ring-amber-400 shadow-xl"
                  : "ring-2 ring-transparent opacity-85"
              }`}
            >
              <span className="text-2xl">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                <div className="text-[10px] text-slate-600 truncate">{p.description}</div>
              </div>
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// =================== STEP 4: LANGUAGE ===================
function StepLanguage({ selected, onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/40"
      >
        <span className="text-3xl">🗣️</span>
      </motion.div>
      <h1 className="text-2xl font-black mb-2">Ta langue préférée</h1>
      <p className="text-sm text-white/80 mb-6">Comment veux-tu que le prof te parle ?</p>

      <div className="space-y-3">
        {LANGUAGE_OPTIONS.map((l) => {
          const isSelected = selected === l.id;
          return (
            <motion.button
              key={l.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(l.id)}
              className={`w-full p-4 rounded-2xl bg-white text-left flex items-center gap-3 transition-all ${
                isSelected
                  ? "ring-4 ring-amber-400 shadow-xl"
                  : "ring-2 ring-transparent opacity-85"
              }`}
            >
              <span className="text-3xl">{l.icon}</span>
              <div className="flex-1">
                <div className="font-bold text-slate-900 text-base">{l.name}</div>
                <div className="text-xs text-slate-600">{l.description}</div>
              </div>
              {isSelected && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-white" strokeWidth={3} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
