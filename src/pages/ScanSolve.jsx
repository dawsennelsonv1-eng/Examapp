// src/pages/ScanSolve.jsx
// Captures image from camera, sends to /api/solve, displays the real AI solution.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, RefreshCw, AlertCircle, Loader2, ChevronRight,
  ArrowLeft, Sparkles, BookOpen, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import CameraCapture from "../components/scan/CameraCapture";
import SolutionStep from "../components/scan/SolutionStep";
import { useApp } from "../contexts/AppContext";

export default function ScanSolve() {
  const navigate = useNavigate();
  const { track } = useApp();

  const [step, setStep] = useState("camera"); // camera | solving | solution | error
  const [capturedImage, setCapturedImage] = useState(null);
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState(null);

  const handleCapture = async (imageDataUrl) => {
    setCapturedImage(imageDataUrl);
    setStep("solving");
    setError(null);

    try {
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-" + Date.now(),
          input: {
            imageData: imageDataUrl,
            subject: "Physique", // Could detect from photo later
            track: track || "NS4",
          },
        }),
      });

      if (response.status === 422) {
        const body = await response.json();
        setError(
          body.message ||
          "L'image n'est pas assez claire. Reprends la photo."
        );
        setStep("error");
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      if (!result?.data) {
        throw new Error("Réponse invalide du serveur");
      }

      setSolution(result.data);
      setStep("solution");
    } catch (err) {
      console.error("Solve error:", err);
      setError(
        "Impossible de résoudre l'exercice. Vérifie ta connexion internet et réessaye."
      );
      setStep("error");
    }
  };

  const handleRetry = () => {
    setStep("camera");
    setCapturedImage(null);
    setSolution(null);
    setError(null);
  };

  if (step === "camera") {
    return (
      <CameraCapture
        onCapture={handleCapture}
        onClose={() => navigate("/")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="font-bold text-sm text-slate-900 dark:text-white">
            Solution
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Niveau {track || "NS4"}
          </div>
        </div>
        {step === "solution" && (
          <button
            onClick={handleRetry}
            className="text-xs font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Nouveau
          </button>
        )}
      </header>

      {/* Image preview */}
      {capturedImage && (
        <div className="px-4 pt-4">
          <div className="relative rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-md">
            <img
              src={capturedImage}
              alt="Exercice capturé"
              className="w-full max-h-48 object-cover"
            />
            {step === "solving" && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <div className="text-white text-center">
                  <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                  <div className="text-sm font-semibold">Lecture de l'image...</div>
                  <div className="text-xs opacity-75 mt-1">Le prof analyse</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Solving state */}
      {step === "solving" && !capturedImage && (
        <div className="px-4 py-12 text-center">
          <Loader2 size={36} className="animate-spin mx-auto text-violet-600 mb-4" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Le prof réfléchit...
          </p>
        </div>
      )}

      {/* Error state */}
      <AnimatePresence>
        {step === "error" && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mx-4 mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 flex gap-3"
          >
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-sm text-red-900 dark:text-red-200 mb-1">
                Oups
              </div>
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed mb-3">
                {error}
              </p>
              <button
                onClick={handleRetry}
                className="text-xs font-bold text-red-700 dark:text-red-300 underline"
              >
                Reprendre une photo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Solution */}
      <AnimatePresence>
        {step === "solution" && solution && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="px-4 mt-4 space-y-4"
          >
            {/* Problem statement */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={16} className="text-violet-600 dark:text-violet-400" />
                <h2 className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
                  Énoncé
                </h2>
              </div>
              <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                {solution.problemStatement}
              </p>
            </section>

            {/* Donnée */}
            <section className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 p-4 border border-violet-100 dark:border-violet-500/20">
              <h2 className="text-xs uppercase tracking-widest font-bold text-violet-700 dark:text-violet-400 mb-2">
                Donnée
              </h2>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {solution.donnee}
              </p>
            </section>

            {/* Formule */}
            <section className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 p-4 border border-amber-100 dark:border-amber-500/20">
              <h2 className="text-xs uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400 mb-2">
                Formule
              </h2>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
                {solution.formule}
              </p>
            </section>

            {/* Steps */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
              <h2 className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-3">
                Résolution
              </h2>
              <div className="space-y-2">
                {solution.steps?.map((s, i) => (
                  <SolutionStep
                    key={i}
                    step={s}
                    index={i}
                    problemStatement={solution.problemStatement}
                  />
                ))}
              </div>
            </section>

            {/* Final answer */}
            <section className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} />
                <h2 className="text-xs uppercase tracking-widest font-bold opacity-90">
                  Réponse finale
                </h2>
              </div>
              <p className="text-xl font-bold font-mono">
                {solution.finalAnswer}
              </p>
            </section>

            {/* Traps */}
            {solution.traps?.length > 0 && (
              <section className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 border border-red-100 dark:border-red-500/20">
                <h2 className="text-xs uppercase tracking-widest font-bold text-red-700 dark:text-red-400 mb-2">
                  ⚠️ Pièges à éviter
                </h2>
                <ul className="space-y-1.5">
                  {solution.traps.map((trap, i) => (
                    <li
                      key={i}
                      className="text-xs text-red-900 dark:text-red-200 flex gap-2"
                    >
                      <span>•</span>
                      <span>{trap}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
