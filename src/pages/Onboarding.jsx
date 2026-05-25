// src/pages/Onboarding.jsx
// Conversational onboarding: the tutor introduces itself and asks the student
// 4 questions across screens. Each answer is saved to preferences/AppContext.
//
// Flow: Welcome → Name → Track → Language → Personality → Done

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { PERSONALITIES, LANGUAGE_OPTIONS } from "../utils/constants";

const STEPS = ["welcome", "name", "track", "language", "personality", "done"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setTrack, setPreferences, TRACKS } = useApp();

  const [step, setStep] = useState("welcome");
  const [name, setName] = useState("");
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [language, setLanguage] = useState(null);
  const [personality, setPersonality] = useState(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (step === "name") {
      setTimeout(() => nameInputRef.current?.focus(), 400);
    }
  }, [step]);

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const finish = () => {
    if (selectedTrack) setTrack(selectedTrack);
    setPreferences({
      name: name.trim(),
      language,
      personality,
      onboardedAt: Date.now(),
    });
    setTimeout(() => navigate("/", { replace: true }), 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-950 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-violet-500 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-indigo-500 blur-3xl" />
        <div className="absolute top-40 right-20 w-32 h-32 rounded-full bg-amber-400 blur-3xl opacity-50" />
      </div>

      {/* Progress dots */}
      {step !== "welcome" && step !== "done" && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-2">
          {STEPS.slice(1, -1).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                STEPS.indexOf(step) > i
                  ? "w-8 bg-violet-400"
                  : STEPS.indexOf(step) === i + 1
                  ? "w-8 bg-white"
                  : "w-4 bg-white/30"
              }`}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <Welcome key="welcome" onNext={goNext} />
          )}
          {step === "name" && (
            <NameStep
              key="name"
              name={name}
              setName={setName}
              inputRef={nameInputRef}
              onNext={goNext}
            />
          )}
          {step === "track" && (
            <TrackStep
              key="track"
              name={name}
              selectedTrack={selectedTrack}
              setSelectedTrack={setSelectedTrack}
              onNext={goNext}
              TRACKS={TRACKS}
            />
          )}
          {step === "language" && (
            <LanguageStep
              key="language"
              language={language}
              setLanguage={setLanguage}
              onNext={goNext}
            />
          )}
          {step === "personality" && (
            <PersonalityStep
              key="personality"
              personality={personality}
              setPersonality={setPersonality}
              onNext={() => {
                setStep("done");
                setTimeout(finish, 1800);
              }}
            />
          )}
          {step === "done" && <DoneStep key="done" name={name} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepCard({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

function TutorAvatar({ size = "lg" }) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
      }}
      transition={{ duration: 3, repeat: Infinity }}
      className={`${
        size === "lg" ? "w-20 h-20" : "w-12 h-12"
      } rounded-3xl bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/50 mx-auto mb-6`}
    >
      <Sparkles
        size={size === "lg" ? 36 : 22}
        className="text-white"
        strokeWidth={2.5}
      />
    </motion.div>
  );
}

function Welcome({ onNext }) {
  return (
    <StepCard>
      <TutorAvatar />
      <h1 className="text-3xl font-bold text-center mb-3 leading-tight">
        Bonjou !
      </h1>
      <p className="text-white/80 text-center mb-2 text-lg">
        Mwen se <b className="text-amber-300">Pwofesè AI</b>
      </p>
      <p className="text-white/70 text-center mb-10 leading-relaxed">
        Je suis là pour t'aider à conquérir ton examen MENFP. <br />
        Avant qu'on commence, dis-moi qui tu es.
      </p>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        className="w-full py-4 rounded-2xl bg-white text-indigo-700 font-bold text-lg shadow-2xl flex items-center justify-center gap-2"
      >
        Allons-y
        <ArrowRight size={20} />
      </motion.button>
    </StepCard>
  );
}

function NameStep({ name, setName, inputRef, onNext }) {
  const canContinue = name.trim().length >= 2;
  return (
    <StepCard>
      <TutorAvatar size="sm" />
      <h2 className="text-2xl font-bold text-center mb-2">
        Comment tu t'appelles ?
      </h2>
      <p className="text-white/70 text-center mb-8 text-sm">
        Kijan ou rele ?
      </p>
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ton prénom"
        className="w-full px-5 py-4 rounded-2xl bg-white/10 backdrop-blur-sm text-white text-lg text-center placeholder:text-white/40 border-2 border-white/20 focus:border-violet-400 focus:outline-none mb-6"
        onKeyDown={(e) => e.key === "Enter" && canContinue && onNext()}
      />
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        disabled={!canContinue}
        className="w-full py-4 rounded-2xl bg-white text-indigo-700 font-bold text-lg shadow-2xl disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2"
      >
        Continuer
        <ArrowRight size={20} />
      </motion.button>
    </StepCard>
  );
}

function TrackStep({ name, selectedTrack, setSelectedTrack, onNext, TRACKS }) {
  return (
    <StepCard>
      <TutorAvatar size="sm" />
      <h2 className="text-2xl font-bold text-center mb-2">
        Anchante {name} !
      </h2>
      <p className="text-white/70 text-center mb-8">
        Pour quel examen tu te prépares ?
      </p>
      <div className="space-y-3 mb-6">
        <SelectCard
          selected={selectedTrack === TRACKS.NINE_AF}
          onClick={() => setSelectedTrack(TRACKS.NINE_AF)}
          title="9ème AF"
          subtitle="Fin du cycle fondamental"
          icon="📘"
        />
        <SelectCard
          selected={selectedTrack === TRACKS.NS4}
          onClick={() => setSelectedTrack(TRACKS.NS4)}
          title="Nouveau Secondaire IV"
          subtitle="Le bac haïtien"
          icon="🎓"
        />
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        disabled={!selectedTrack}
        className="w-full py-4 rounded-2xl bg-white text-indigo-700 font-bold text-lg shadow-2xl disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2"
      >
        Continuer
        <ArrowRight size={20} />
      </motion.button>
    </StepCard>
  );
}

function LanguageStep({ language, setLanguage, onNext }) {
  return (
    <StepCard>
      <TutorAvatar size="sm" />
      <h2 className="text-2xl font-bold text-center mb-2">
        Comment tu veux que je te parle ?
      </h2>
      <p className="text-white/70 text-center mb-8 text-sm">
        Kijan ou vle m pale avè w ?
      </p>
      <div className="space-y-3 mb-6">
        {LANGUAGE_OPTIONS.map((opt) => (
          <SelectCard
            key={opt.id}
            selected={language === opt.id}
            onClick={() => setLanguage(opt.id)}
            title={opt.name}
            subtitle={opt.description}
            icon={opt.icon}
            badge={opt.badge}
          />
        ))}
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        disabled={!language}
        className="w-full py-4 rounded-2xl bg-white text-indigo-700 font-bold text-lg shadow-2xl disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2"
      >
        Continuer
        <ArrowRight size={20} />
      </motion.button>
    </StepCard>
  );
}

function PersonalityStep({ personality, setPersonality, onNext }) {
  return (
    <StepCard>
      <TutorAvatar size="sm" />
      <h2 className="text-2xl font-bold text-center mb-2">
        Quel genre de prof veux-tu que je sois ?
      </h2>
      <p className="text-white/70 text-center mb-6 text-sm">
        Choisis l'approche qui te convient
      </p>
      <div className="space-y-2 mb-6">
        {PERSONALITIES.map((p) => (
          <SelectCard
            key={p.id}
            selected={personality === p.id}
            onClick={() => setPersonality(p.id)}
            title={p.name}
            subtitle={p.description}
            icon={p.icon}
          />
        ))}
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        disabled={!personality}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold text-lg shadow-2xl disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2"
      >
        On commence !
        <ArrowRight size={20} />
      </motion.button>
    </StepCard>
  );
}

function DoneStep({ name }) {
  return (
    <StepCard>
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/50"
      >
        <Check size={48} className="text-white" strokeWidth={3} />
      </motion.div>
      <h2 className="text-2xl font-bold text-center mb-2">
        Tout est prêt, {name} !
      </h2>
      <p className="text-white/70 text-center text-sm">
        N'ap kòmanse aprann ansanm...
      </p>
    </StepCard>
  );
}

function SelectCard({ selected, onClick, title, subtitle, icon, badge }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${
        selected
          ? "bg-white text-slate-900 ring-4 ring-amber-400"
          : "bg-white/10 backdrop-blur-sm text-white border-2 border-white/20"
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-900">
          {badge}
        </span>
      )}
      <div className="text-3xl flex-shrink-0">{icon}</div>
      <div className="flex-1 text-left">
        <div className="font-bold text-base">{title}</div>
        <div className={`text-xs ${selected ? "text-slate-600" : "text-white/60"}`}>
          {subtitle}
        </div>
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0"
        >
          <Check size={14} className="text-white" strokeWidth={3} />
        </motion.div>
      )}
    </motion.button>
  );
}
