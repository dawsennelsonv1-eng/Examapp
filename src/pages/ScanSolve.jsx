// src/pages/ScanSolve.jsx
// Tab 2 — Core engine. Camera mock → Claude webhook → progressively unblurred solution.
// Implements: Hypothèse / Formule / Résolution, animated unblur, See-all bypass,
// "Eksplike m sa" audio, and "Explain differently" adaptive re-fetch.

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../contexts/AppContext";
import { solveProblem, explainDifferently } from "../services/webhookClient";
import SolutionStep from "../components/scan/SolutionStep";
import AudioButton from "../components/scan/AudioButton";

export default function ScanSolve() {
  const { t, lang, track } = useApp();
  const [phase, setPhase] = useState("camera"); // camera | loading | solution
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState(null);

  // Progressive unlock: index of the next step still blurred.
  // 0 means everything from step 0 onward is locked; length means all visible.
  const [unlockedUpTo, setUnlockedUpTo] = useState(0);
  const [reFetching, setReFetching] = useState(false);
  const fileInputRef = useRef(null);

  const handleCapture = useCallback(
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
        setUnlockedUpTo(0); // only the header/hypothèse are always visible; steps start locked
        setPhase("solution");
      } catch (e) {
        setError(t("error_generic"));
        setPhase("camera");
      }
    },
    [lang, track, t]
  );

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleCapture(reader.result);
    reader.readAsDataURL(file);
  };

  const unlockNext = () => {
    setUnlockedUpTo((n) => Math.min(n + 1, solution?.steps.length ?? 0));
  };

  const revealAll = () => {
    setUnlockedUpTo(solution?.steps.length ?? 0);
  };

  const handleExplainDifferently = async () => {
    if (!solution) return;
    setReFetching(true);
    try {
      const alt = await explainDifferently({
        originalProblem: solution.problemStatement,
        previousExplanation: solution.formule,
        lang,
      });
      // Merge the analogy into the solution as a new top step
      setSolution((s) => ({
        ...s,
        formule: alt.analogy || s.formule,
      }));
    } catch (e) {
      setError(t("error_generic"));
    } finally {
      setReFetching(false);
    }
  };

  const resetToCamera = () => {
    setSolution(null);
    setUnlockedUpTo(0);
    setPhase("camera");
  };

  const allRevealed =
    solution && unlockedUpTo >= solution.steps.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-white/70 dark:bg-slate-900/70
        border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {t("scan_title")}
          </h1>
          {phase === "solution" && (
            <button
              onClick={resetToCamera}
              className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              ← {t("scan_capture")}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {phase === "camera" && (
            <CameraView
              key="cam"
              onCapture={handleCapture}
              onUpload={() => fileInputRef.current?.click()}
              error={error}
            />
          )}

          {phase === "loading" && (
            <LoadingView key="load" />
          )}

          {phase === "solution" && solution && (
            <motion.div
              key="sol"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Problem statement */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700
                  text-white p-5 shadow-lg shadow-indigo-500/20"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-[11px] uppercase tracking-widest font-bold
                    text-indigo-200">Problème</span>
                  <AudioButton
                    text={solution.problemStatement}
                    className="bg-white/10 text-white ring-white/20 hover:bg-white/20"
                  />
                </div>
                <p className="text-sm leading-relaxed">{solution.problemStatement}</p>
              </motion.div>

              {/* Hypothèse */}
              <StrictFormatBlock
                label={t("hypothese")}
                content={solution.hypothese}
                accent="emerald"
              />

              {/* Formule */}
              <StrictFormatBlock
                label={t("formule")}
                content={solution.formule}
                accent="amber"
                isFormula
              />

              {/* Résolution — progressive unlock */}
              <section>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider
                    text-slate-700 dark:text-slate-300">
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
                      onUnlock={unlockNext}
                    />
                  ))}
                </div>
              </section>

              {/* Action bar */}
              <motion.div
                layout
                className="sticky bottom-20 mt-6 flex flex-col gap-2"
              >
                {!allRevealed && unlockedUpTo > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={unlockNext}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700
                      text-white font-semibold shadow-lg shadow-indigo-500/30
                      flex items-center justify-center gap-2"
                  >
                    <span>🔓</span>
                    {t("unblur_next")}
                  </motion.button>
                )}

                {!allRevealed && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={revealAll}
                    className="w-full py-3 rounded-xl border-2 border-dashed
                      border-slate-300 dark:border-slate-600
                      text-slate-600 dark:text-slate-300 font-medium
                      hover:border-indigo-500 hover:text-indigo-600
                      dark:hover:text-indigo-400 transition-colors"
                  >
                    ⏭ {t("see_all")}
                  </motion.button>
                )}

                {allRevealed && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30
                      p-5 text-center"
                  >
                    <div className="text-xs font-bold uppercase tracking-widest
                      text-emerald-700 dark:text-emerald-400 mb-1">
                      Réponse finale
                    </div>
                    <div className="text-2xl font-mono font-bold
                      text-emerald-800 dark:text-emerald-300">
                      {solution.finalAnswer}
                    </div>
                  </motion.div>
                )}

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExplainDifferently}
                  disabled={reFetching}
                  className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800
                    text-slate-700 dark:text-slate-200 font-medium
                    hover:bg-slate-200 dark:hover:bg-slate-700
                    flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {reFetching ? (
                    <span className="inline-block w-4 h-4 rounded-full border-2
                      border-slate-400 border-t-transparent animate-spin" />
                  ) : (
                    "💡"
                  )}
                  {t("explain_differently")}
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFilePick}
          className="hidden"
        />
      </main>
    </div>
  );
}

/* --------------------------- Sub-components --------------------------- */

function CameraView({ onCapture, onUpload, error }) {
  const { t } = useApp();
  // Use mock image to simulate a scanned problem without real camera wiring
  const simulateCapture = () =>
    onCapture("data:image/png;base64,MOCK_SCANNED_PROBLEM");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <div className="relative aspect-[3/4] rounded-3xl overflow-hidden
        bg-slate-900 border border-slate-700 shadow-2xl">
        {/* Scanner frame */}
        <div className="absolute inset-6 border-2 border-white/40 rounded-2xl pointer-events-none">
          <CornerBrackets />
        </div>

        {/* Animated scan line */}
        <motion.div
          initial={{ top: "10%" }}
          animate={{ top: "90%" }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="absolute left-6 right-6 h-0.5 bg-gradient-to-r
            from-transparent via-indigo-400 to-transparent shadow-lg shadow-indigo-500/50"
        />

        <div className="absolute inset-0 flex items-end justify-center pb-8">
          <p className="text-white/80 text-sm px-6 text-center">
            {t("scan_placeholder")}
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500 text-center">{error}</div>
      )}

      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={simulateCapture}
          className="flex-1 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700
            text-white font-semibold shadow-lg shadow-indigo-500/30"
        >
          📷 {t("scan_capture")}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onUpload}
          className="px-5 py-4 rounded-xl bg-slate-200 dark:bg-slate-800
            text-slate-700 dark:text-slate-200 font-semibold"
        >
          🖼
        </motion.button>
      </div>
    </motion.div>
  );
}

function CornerBrackets() {
  const base = "absolute w-6 h-6 border-indigo-400";
  return (
    <>
      <span className={`${base} top-0 left-0 border-t-4 border-l-4 rounded-tl-lg`} />
      <span className={`${base} top-0 right-0 border-t-4 border-r-4 rounded-tr-lg`} />
      <span className={`${base} bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg`} />
      <span className={`${base} bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg`} />
    </>
  );
}

function LoadingView() {
  const { lang } = useApp();
  const messages = lang === "ht"
    ? ["N ap li pwoblèm ou an...", "Pwofesè a ap reflechi...", "N ap prepare solisyon an..."]
    : ["Lecture du problème...", "Le professeur réfléchit...", "Préparation de la solution..."];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-20 gap-6"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 rounded-full border-4 border-indigo-200
          border-t-indigo-600"
      />
      <motion.p
        key={Math.floor(Date.now() / 1500) % messages.length}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-slate-600 dark:text-slate-300 font-medium"
      >
        {messages[0]}
      </motion.p>
    </motion.div>
  );
}

function StrictFormatBlock({ label, content, accent = "indigo", isFormula = false }) {
  const palettes = {
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
    indigo: "bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-400",
  };
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`rounded-2xl border p-5 ${palettes[accent]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-widest font-bold">
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
