// src/pages/ScanSolve.jsx
// Capture image, send to /api/solve, render in Haitian textbook format:
//   Énoncé at top
//   Two columns: Données (left) | Solution sections (right)
//   Big attention-grabbing "Je ne comprends pas" button at bottom

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, AlertCircle, Loader2,
  HelpCircle, Sparkles, MessageCircleQuestion,
} from "lucide-react";
import CameraCapture from "../components/scan/CameraCapture";
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
            subject: "Physique",
            track: track || "NS4",
          },
        }),
      });

      if (response.status === 422) {
        const body = await response.json();
        setError(body.message || "L'image n'est pas assez claire. Reprends la photo.");
        setStep("error");
        return;
      }

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const result = await response.json();
      if (!result?.data) throw new Error("Réponse invalide du serveur");

      setSolution(result.data);
      setStep("solution");
    } catch (err) {
      console.error("Solve error:", err);
      setError("Impossible de résoudre. Vérifie ta connexion et réessaye.");
      setStep("error");
    }
  };

  const handleRetry = () => {
    setStep("camera");
    setCapturedImage(null);
    setSolution(null);
    setError(null);
  };

  const handleAskTutor = () => {
    // Pass the exercise to the classroom via sessionStorage
    const exerciseData = {
      enonce: solution.enonce,
      donnees: solution.donnees,
      sections: solution.sections,
      capturedImage,
      timestamp: Date.now(),
    };
    sessionStorage.setItem("laureat.pendingExercise", JSON.stringify(exerciseData));
    navigate("/classe?new=1");
  };

  if (step === "camera") {
    return <CameraCapture onCapture={handleCapture} onClose={() => navigate("/")} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
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

      {/* Captured image preview */}
      {capturedImage && (
        <div className="px-4 pt-4">
          <div className="relative rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-md">
            <img
              src={capturedImage}
              alt="Exercice capturé"
              className="w-full max-h-40 object-cover"
            />
            {step === "solving" && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <div className="text-white text-center">
                  <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                  <div className="text-sm font-bold">Lecture de l'image...</div>
                  <div className="text-xs opacity-75 mt-1">Le prof analyse</div>
                </div>
              </div>
            )}
          </div>
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

      {/* Solution display — Haitian textbook format */}
      <AnimatePresence>
        {step === "solution" && solution && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="px-4 mt-4 space-y-4"
          >
            {/* Énoncé */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
              <h2 className="text-[10px] uppercase tracking-widest font-black text-violet-600 dark:text-violet-400 mb-2">
                Énoncé
              </h2>
              <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                {solution.enonce}
              </p>
            </section>

            {/* Two-column layout: Données | Solution */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="grid grid-cols-12">
                {/* Données column (left, ~35%) */}
                <div className="col-span-4 p-4 bg-violet-50 dark:bg-violet-950/30 border-r border-slate-200 dark:border-slate-700">
                  <h3 className="text-[10px] uppercase tracking-widest font-black text-violet-700 dark:text-violet-400 mb-3 border-b-2 border-violet-200 dark:border-violet-700 pb-1.5">
                    Données
                  </h3>
                  <div className="space-y-1.5 font-mono text-xs text-slate-900 dark:text-slate-100">
                    {solution.donnees?.map((d, i) => (
                      <DonneeRow key={i} donnee={d} />
                    ))}
                  </div>
                </div>

                {/* Solution column (right, ~65%) */}
                <div className="col-span-8 p-4">
                  {solution.sections?.map((section, i) => (
                    <SolutionSection
                      key={i}
                      section={section}
                      isLast={i === solution.sections.length - 1}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Traps */}
            {solution.traps?.length > 0 && (
              <section className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-500/30">
                <h3 className="text-[10px] uppercase tracking-widest font-black text-amber-700 dark:text-amber-400 mb-2">
                  ⚠️ Pièges courants
                </h3>
                <ul className="space-y-1.5">
                  {solution.traps.map((trap, i) => (
                    <li key={i} className="text-xs text-amber-900 dark:text-amber-200 flex gap-2">
                      <span>•</span>
                      <span className="leading-relaxed">{trap}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* CTA: "Je ne comprends pas" — big, attention-grabbing */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              animate={{
                boxShadow: [
                  "0 10px 30px rgba(245, 158, 11, 0.3)",
                  "0 10px 40px rgba(245, 158, 11, 0.5)",
                  "0 10px 30px rgba(245, 158, 11, 0.3)",
                ],
              }}
              transition={{
                boxShadow: { duration: 2, repeat: Infinity },
              }}
              onClick={handleAskTutor}
              className="w-full mt-2 p-5 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 text-white font-bold shadow-xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
              <div className="relative flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <MessageCircleQuestion size={22} />
                </div>
                <div className="text-left">
                  <div className="text-base font-black">Je comprends pas, explique-moi</div>
                  <div className="text-xs font-medium opacity-90">
                    Le prof t'explique étape par étape
                  </div>
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DonneeRow({ donnee }) {
  if (donnee.isQuestion) {
    return (
      <div className="font-semibold text-violet-700 dark:text-violet-300">
        {donnee.symbol} = <span className="text-amber-600 dark:text-amber-400">?</span>
      </div>
    );
  }
  return (
    <div>
      <span className="font-semibold">{donnee.symbol}</span>
      <span className="text-slate-500"> = </span>
      <span className="font-bold text-slate-900 dark:text-white">{donnee.value}</span>
      {donnee.unit && (
        <span className="text-slate-600 dark:text-slate-400 ml-1">{donnee.unit}</span>
      )}
    </div>
  );
}

function SolutionSection({ section, isLast }) {
  return (
    <div className={`${isLast ? "" : "pb-4 mb-4 border-b border-slate-100 dark:border-slate-800"}`}>
      <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-baseline gap-1.5">
        <span className="text-violet-600 dark:text-violet-400">{section.number}-</span>
        <span className="italic text-slate-700 dark:text-slate-300">
          {section.verb}
        </span>{" "}
        <span className="text-slate-600 dark:text-slate-400 font-normal">
          {section.title}
        </span>
      </h4>
      <div className="space-y-1.5 pl-2 font-mono text-xs">
        {section.steps?.map((step, i) => (
          <StepLine key={i} step={step} />
        ))}
      </div>
    </div>
  );
}

function StepLine({ step }) {
  if (step.type === "result" && step.boxed) {
    return (
      <div className="my-2 inline-block">
        <div className="px-3 py-1.5 border-2 border-emerald-500 dark:border-emerald-400 rounded-md bg-emerald-50 dark:bg-emerald-950/30 font-bold text-emerald-700 dark:text-emerald-300">
          {step.content}
        </div>
      </div>
    );
  }
  if (step.type === "conversion") {
    return (
      <div className="text-blue-700 dark:text-blue-400 italic">
        {step.content}
        {step.note && (
          <span className="text-[10px] ml-2 opacity-75">({step.note})</span>
        )}
      </div>
    );
  }
  if (step.type === "deduction") {
    return (
      <div className="text-slate-700 dark:text-slate-300">
        <span className="italic text-violet-600 dark:text-violet-400">→ </span>
        {step.content}
      </div>
    );
  }
  if (step.type === "note") {
    return (
      <div className="text-slate-500 dark:text-slate-400 text-xs italic font-sans">
        {step.content}
      </div>
    );
  }
  return (
    <div className="text-slate-700 dark:text-slate-300">
      {step.content}
    </div>
  );
}
