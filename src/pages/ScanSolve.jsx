// src/pages/ScanSolve.jsx
// Uses real fullscreen camera. Gallery button opens actual file picker
// (no more capture="environment" hijacking the front camera).

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Camera, Lightbulb, SkipForward, Unlock, CheckCircle2 } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { solveProblem, explainDifferently } from "../services/webhookClient";
import SolutionStep from "../components/scan/SolutionStep";
import AudioButton from "../components/scan/AudioButton";
import CameraCapture from "../components/scan/CameraCapture";

export default function ScanSolve() {
  const { t, lang, track } = useApp();
  const [phase, setPhase] = useState("intro"); // intro | camera | loading | solution
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState(null);
  const [unlockedUpTo, setUnlockedUpTo] = useState(0);
  const [reFetching, setReFetching] = useState(false);
  const galleryInputRef = useRef(null);

  const processImage = useCallback(
    async (imageDataUrl) => {
      setPhase("loading");
      setError(null);
      try {
        const result = await solveProblem({
          imageData: imageDataUrl,
          subject: "Physique",
          track,
          lang,
        });
        setSolution(result);
        setUnlockedUpTo(0);
        setPhase("solution");
      } catch (e) {
        setError(t("error_generic"));
        setPhase("intro");
      }
    },
    [lang, track, t]
  );

  const openGallery = () => {
    galleryInputRef.current?.click();
  };

  const handleGalleryPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => processImage(reader.result);
    reader.readAsDataURL(file);
    e.target.value = ""; // reset so same file can be picked again
  };

  const unlockNext = () =>
    setUnlockedUpTo((n) => Math.min(n + 1, solution?.steps.length ?? 0));
  const revealAll = () => setUnlockedUpTo(solution?.steps.length ?? 0);

  const handleExplainDifferently = async () => {
    if (!solution) return;
    setReFetching(true);
    try {
      const alt = await explainDifferently({
        originalProblem: solution.problemStatement,
        previousExplanation: solution.formule,
        lang,
      });
      setSolution((s) => ({ ...s, formule: alt.analogy || s.formule }));
    } catch (e) {
      setError(t("error_generic"));
    } finally {
      setReFetching(false);
    }
  };

  const allRevealed = solution && unlockedUpTo >= solution.steps.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Fullscreen camera */}
      <AnimatePresence>
        {phase === "camera" && (
          <CameraCapture
            onCapture={processImage}
            onClose={() => setPhase("intro")}
            onOpenGallery={openGallery}
          />
        )}
      </AnimatePresence>

      {/* Hidden file input for gallery */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryPick}
        className="hidden"
      />

      {/* Intro screen */}
      {phase === "intro" && (
        <IntroView
          onOpenCamera={() => setPhase("camera")}
          onOpenGallery={openGallery}
          error={error}
        />
      )}

      {/* Loading */}
      {phase === "loading" && <LoadingView lang={lang} />}

      {/* Solution */}
      {phase === "solution" && solution && (
        <SolutionView
          solution={solution}
          unlockedUpTo={unlockedUpTo}
          onUnlockNext={unlockNext}
          onRevealAll={revealAll}
          onExplainDifferently={handleExplainDifferently}
          onReset={() => {
            setSolution(null);
            setUnlockedUpTo(0);
            setPhase("intro");
          }}
          reFetching={reFetching}
          allRevealed={allRevealed}
          t={t}
        />
      )}
    </div>
  );
}

/* ─────────────── Intro Screen ─────────────── */

function IntroView({ onOpenCamera, onOpenGallery, error }) {
  const { lang } = useApp();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 pb-32">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-sm"
      >
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center shadow-xl shadow-violet-500/40">
          <Camera size={40} className="text-white" strokeWidth={2} />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          {lang === "ht" ? "Skane yon pwoblèm" : "Scanner un problème"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8">
          {lang === "ht"
            ? "Pran yon foto egzèsis ou a, epi pwofesè a ap esplike w etap pa etap."
            : "Prends une photo de ton exercice et le professeur t'expliquera étape par étape."}
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onOpenCamera}
            className="w-full py-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white font-bold shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
          >
            <Camera size={20} strokeWidth={2.5} />
            {lang === "ht" ? "Ouvri kamera" : "Ouvrir la caméra"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onOpenGallery}
            className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-2"
          >
            {lang === "ht" ? "📁 Chwazi nan galri" : "📁 Choisir dans la galerie"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────── Loading View ─────────────── */

function LoadingView({ lang }) {
  const messages = lang === "ht"
    ? ["N ap li pwoblèm ou an...", "Pwofesè a ap reflechi...", "N ap prepare solisyon an..."]
    : ["Lecture du problème...", "Le professeur réfléchit...", "Préparation de la solution..."];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 pb-32">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 rounded-full border-4 border-violet-200 dark:border-violet-900 border-t-violet-600"
      />
      <p className="text-slate-600 dark:text-slate-300 font-medium text-center">
        {messages[0]}
      </p>
    </div>
  );
}

/* ─────────────── Solution View ─────────────── */

function SolutionView({
  solution,
  unlockedUpTo,
  onUnlockNext,
  onRevealAll,
  onExplainDifferently,
  onReset,
  reFetching,
  allRevealed,
  t,
}) {
  return (
    <>
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400"
          >
            <ArrowLeft size={18} />
            {t("scan_capture")}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-32 space-y-4">
        {/* Problem */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-5 shadow-lg shadow-violet-500/20"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="text-[11px] uppercase tracking-widest font-bold text-violet-200">
              Problème
            </span>
            <AudioButton
              text={solution.problemStatement}
              className="bg-white/10 text-white ring-white/20 hover:bg-white/20"
            />
          </div>
          <p className="text-sm leading-relaxed">{solution.problemStatement}</p>
        </motion.div>

        {/* Hypothèse */}
        <StrictFormatBlock label={t("hypothese")} content={solution.hypothese} accent="emerald" />

        {/* Formule */}
        <StrictFormatBlock label={t("formule")} content={solution.formule} accent="amber" isFormula />

        {/* Résolution */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t("resolution")}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {unlockedUpTo} / {solution.steps.length}
            </span>
          </div>

          <div className="space-y-3">
            {solution.steps.map((step, i) => (
              <SolutionStep
                key={i}
                step={step}
                index={i}
                locked={i >= unlockedUpTo}
                onUnlock={onUnlockNext}
              />
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2">
          {!allRevealed && unlockedUpTo > 0 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onUnlockNext}
              className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
            >
              <Unlock size={18} />
              {t("unblur_next")}
            </motion.button>
          )}

          {!allRevealed && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onRevealAll}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium flex items-center justify-center gap-2"
            >
              <SkipForward size={18} />
              {t("see_all")}
            </motion.button>
          )}

          {allRevealed && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-center"
            >
              <CheckCircle2 className="mx-auto mb-2 text-emerald-600 dark:text-emerald-400" size={32} />
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">
                Réponse finale
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-800 dark:text-emerald-300">
                {solution.finalAnswer}
              </div>
            </motion.div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onExplainDifferently}
            disabled={reFetching}
            className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {reFetching ? (
              <span className="inline-block w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
            ) : (
              <Lightbulb size={18} />
            )}
            {t("explain_differently")}
          </motion.button>
        </div>
      </main>
    </>
  );
}

function StrictFormatBlock({ label, content, accent = "indigo", isFormula = false }) {
  const palettes = {
    emerald: "bg-emerald-500/10 border-emerald-500/30",
    amber: "bg-amber-500/10 border-amber-500/30",
    indigo: "bg-indigo-500/10 border-indigo-500/30",
  };
  const textColors = {
    emerald: "text-emerald-700 dark:text-emerald-400",
    amber: "text-amber-700 dark:text-amber-400",
    indigo: "text-indigo-700 dark:text-indigo-400",
  };
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`rounded-2xl border p-5 ${palettes[accent]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] uppercase tracking-widest font-bold ${textColors[accent]}`}>
          {label}
        </span>
        <AudioButton text={`${label}. ${content}`} />
      </div>
      <p
        className={`text-slate-800 dark:text-slate-100 leading-relaxed ${
          isFormula ? "font-mono text-[15px]" : ""
        }`}
      >
        {content}
      </p>
    </motion.div>
  );
}
