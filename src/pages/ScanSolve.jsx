// src/pages/ScanSolve.jsx — v23
// Same as v19 but with two key changes:
//   1. Order of solution sections is now:
//      Énoncé → Solved Exercise (Données + Solution) → Produits en croix
//      → THEN Key Formulas, THEN Summary, THEN Traps
//   2. The big pedagogical summary now comes AFTER the actual answer (not before)
//      so user sees solution first.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, AlertCircle, Loader2, MessageCircleQuestion, FileDown, Maximize2,
} from "lucide-react";

import CameraCapture from "../components/scan/CameraCapture";
import ExerciseSelector from "../components/scan/ExerciseSelector";
import VerificationResult from "../components/scan/VerificationResult";
import { KeyFormulas, SummaryCard, AnimatedReveal } from "../components/scan/SolutionExtras";
import ProduitsEnCroix from "../components/shared/ProduitsEnCroix";
import ImageExpandModal from "../components/shared/ImageExpandModal";
import ModelIndicator from "../components/shared/ModelIndicator";
import ShareButton from "../components/shared/ShareButton";

import { useApp } from "../contexts/AppContext";
import { useScanHistory } from "../hooks/useScanHistory";
import { exportSolutionToPDF } from "../services/pdfService";

export default function ScanSolve() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { track } = useApp();
  const { addScan } = useScanHistory();

  const [step, setStep] = useState("camera");
  const [scanMode, setScanMode] = useState("solve");
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedText, setCapturedText] = useState(null);
  const [multipleExercises, setMultipleExercises] = useState(null);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(null);
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState(null);
  const [imageExpanded, setImageExpanded] = useState(false);

  useEffect(() => {
    if (searchParams.get("replay") === "1") {
      const raw = sessionStorage.getItem("laureat.scanReplay");
      if (raw) {
        try {
          const scan = JSON.parse(raw);
          sessionStorage.removeItem("laureat.scanReplay");
          setCapturedImage(scan.capturedImage);
          setSolution(scan);
          setStep("solution");
        } catch {}
      }
    }
  }, []);

  const callSolveAPI = async ({ imageData, problemText, mode, selectedIndex }) => {
    setStep("solving");
    setError(null);
    try {
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-" + Date.now(),
          mode,
          selectedExerciseIndex: selectedIndex,
          input: {
            imageData,
            problemText: problemText || undefined,
            subject: "Physique",
            track: track || "NS4",
          },
        }),
      });

      if (response.status === 422) {
        const body = await response.json();
        setError(body.message || "L'image n'est pas assez claire.");
        setStep("error");
        return;
      }
      if (!response.ok) throw new Error(`Server ${response.status}`);

      const result = await response.json();
      const data = result.data;

      if (data?.multipleExercises) {
        setMultipleExercises(data);
        setStep("picker");
        return;
      }

      setSolution(data);
      setStep("solution");

      if (mode === "solve") {
        addScan({
          enonce: data.enonce,
          donnees: data.donnees,
          sections: data.sections,
          traps: data.traps,
          keyFormulas: data.keyFormulas,
          summary: data.summary,
          produitsEnCroix: data.produitsEnCroix,
          capturedImage: imageData,
          subject: "Physique",
        });
      }
    } catch (err) {
      console.error("Solve error:", err);
      setError("Pa gen koneksyon entènèt la. Verifye epi eseye ankò.");
      setStep("error");
    }
  };

  const handleCapture = async (imageDataUrl, textInput, mode = "solve") => {
    setCapturedImage(imageDataUrl);
    setCapturedText(textInput || null);
    setScanMode(mode);
    setMultipleExercises(null);
    setSelectedExerciseIndex(null);

    await callSolveAPI({
      imageData: imageDataUrl,
      problemText: textInput,
      mode,
      selectedIndex: null,
    });
  };

  const handlePickExercise = async (index) => {
    setSelectedExerciseIndex(index);
    await callSolveAPI({
      imageData: capturedImage,
      problemText: capturedText,
      mode: scanMode,
      selectedIndex: index,
    });
  };

  const handleSolveAll = async () => handlePickExercise(0);

  const handleRetry = () => {
    setStep("camera");
    setCapturedImage(null);
    setCapturedText(null);
    setSolution(null);
    setMultipleExercises(null);
    setError(null);
  };

  const handleAskTutor = () => {
    const exerciseData = {
      enonce: solution.enonce,
      donnees: solution.donnees,
      sections: solution.sections || solution.correctSolution?.sections,
      keyFormulas: solution.keyFormulas,
      capturedImage,
      timestamp: Date.now(),
    };
    sessionStorage.setItem("laureat.pendingExercise", JSON.stringify(exerciseData));
    navigate("/classe?new=1");
  };

  const handlePDF = () => exportSolutionToPDF(solution);

  // ====== Camera ======
  if (step === "camera") {
    return <CameraCapture onCapture={handleCapture} onClose={() => navigate("/")} />;
  }

  // ====== Picker ======
  if (step === "picker" && multipleExercises) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
        <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-2">
          <button onClick={handleRetry} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <ArrowLeft size={18} />
          </button>
          <div className="font-bold text-sm text-slate-900 dark:text-white">Plusieurs exercices détectés</div>
        </header>
        <ExerciseSelector
          exercises={multipleExercises.exercises}
          onSelect={handlePickExercise}
          onSelectAll={handleSolveAll}
        />
      </div>
    );
  }

  // ====== Solution / Error / Solving ======
  const sections = solution?.sections || solution?.correctSolution?.sections;
  const isVerify = solution?.mode === "verify";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-900 dark:text-white">
            {isVerify ? "Vérification" : "Solution"}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Niveau {track || "NS4"}</div>
        </div>

        {step === "solution" && solution && (
          <>
            <ShareButton type="scan_result" payload={{ enonce: solution.enonce, donnees: solution.donnees, sections }} compact />
            <motion.button whileTap={{ scale: 0.92 }} onClick={handlePDF}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300" title="PDF">
              <FileDown size={16} />
            </motion.button>
          </>
        )}
      </header>

      {/* Image thumbnail with tap-to-expand */}
      {capturedImage && (
        <div className="px-4 pt-4">
          <button
            onClick={() => setImageExpanded(true)}
            className="relative w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-md group"
          >
            <img src={capturedImage} alt="Exercice" className="w-full max-h-40 object-cover" />
            <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white">
              <Maximize2 size={14} />
            </div>
            {step === "solving" && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <div className="text-white text-center">
                  <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                  <div className="text-sm font-bold">
                    {isVerify ? "Le prof vérifie ton travail..." : "Lecture de l'image..."}
                  </div>
                </div>
              </div>
            )}
          </button>
        </div>
      )}

      <AnimatePresence>
        {step === "error" && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="mx-4 mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 flex gap-3">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-sm text-red-900 dark:text-red-200 mb-1">Oups</div>
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed mb-3">{error}</p>
              <button onClick={handleRetry} className="text-xs font-bold text-red-700 dark:text-red-300 underline">
                Reprendre une photo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step === "solution" && solution && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-4 mt-4 space-y-4">

            {/* 1. ENONCE — what the exercise was */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
              <h2 className="text-[10px] uppercase tracking-widest font-black text-violet-600 dark:text-violet-400 mb-2">Énoncé</h2>
              <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                <AnimatedReveal text={solution.enonce} delayPerWord={0.025} />
              </p>
            </section>

            {/* 2. VERIFICATION VERDICT (verify mode only) */}
            {isVerify && (
              <VerificationResult
                verdict={solution.verdict}
                verdictScore={solution.verdictScore}
                mistakes={solution.userMistakes || []}
                strengths={solution.userStrengths || []}
                tips={solution.tips || []}
              />
            )}

            {/* 3. THE SOLVED EXERCISE — Données + Solution (THE answer, shown FIRST) */}
            {sections && sections.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700">
                <div className="grid grid-cols-12">
                  <div className="col-span-4 p-4 bg-violet-50 dark:bg-violet-950/30 border-r border-slate-200 dark:border-slate-700">
                    <h3 className="text-[10px] uppercase tracking-widest font-black text-violet-700 dark:text-violet-400 mb-3 border-b-2 border-violet-200 dark:border-violet-700 pb-1.5">Données</h3>
                    <div className="space-y-1.5 font-mono text-xs text-slate-900 dark:text-slate-100">
                      {solution.donnees?.map((d, i) => (
                        d.isQuestion ? (
                          <div key={i} className="font-semibold text-violet-700 dark:text-violet-300">
                            {d.symbol} = <span className="text-amber-600 dark:text-amber-400">?</span>
                          </div>
                        ) : (
                          <div key={i}>
                            <span className="font-semibold">{d.symbol}</span>
                            <span className="text-slate-500"> = </span>
                            <span className="font-bold text-slate-900 dark:text-white">{d.value}</span>
                            {d.unit && <span className="text-slate-600 dark:text-slate-400 ml-1">{d.unit}</span>}
                          </div>
                        )
                      ))}
                    </div>
                  </div>

                  <div className="col-span-8 p-4">
                    {sections.map((section, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 * i }}
                        className={i < sections.length - 1 ? "pb-4 mb-4 border-b border-slate-100 dark:border-slate-800" : ""}
                      >
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-baseline gap-1.5">
                          <span className="text-violet-600 dark:text-violet-400">{section.number}-</span>
                          <span className="italic text-slate-700 dark:text-slate-300">{section.verb}</span>{" "}
                          <span className="text-slate-600 dark:text-slate-400 font-normal">{section.title}</span>
                        </h4>
                        <div className="space-y-1.5 pl-2 font-mono text-xs">
                          {section.steps?.map((step, j) => (
                            step.type === "result" && step.boxed ? (
                              <div key={j} className="my-2 inline-block">
                                <div className="px-3 py-1.5 border-2 border-emerald-500 dark:border-emerald-400 rounded-md bg-emerald-50 dark:bg-emerald-950/30 font-bold text-emerald-700 dark:text-emerald-300">
                                  {step.content}
                                </div>
                              </div>
                            ) : step.type === "conversion" ? (
                              <div key={j} className="text-blue-700 dark:text-blue-400 italic">{step.content}</div>
                            ) : (
                              <div key={j} className="text-slate-700 dark:text-slate-300">{step.content}</div>
                            )
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. PRODUITS EN CROIX (still part of the answer) */}
            {solution.produitsEnCroix && solution.produitsEnCroix.length > 0 && (
              <ProduitsEnCroix data={solution.produitsEnCroix} />
            )}

            {/* === NOW we move into the explanatory section, BELOW the answer === */}

            {/* 5. KEY FORMULAS — the formulas needed (educational, comes AFTER the solution) */}
            <KeyFormulas formulas={solution.keyFormulas} />

            {/* 6. PEDAGOGICAL SUMMARY — moved to AFTER the solved exercise (per your request) */}
            {solution.summary && <SummaryCard text={solution.summary} />}

            {/* 7. TRAPS */}
            {solution.traps?.length > 0 && (
              <section className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-500/30">
                <h3 className="text-[10px] uppercase tracking-widest font-black text-amber-700 dark:text-amber-400 mb-2">⚠️ Pièges courants</h3>
                <ul className="space-y-1.5">
                  {solution.traps.map((trap, i) => (
                    <li key={i} className="text-xs text-amber-900 dark:text-amber-200 flex gap-2">
                      <span>•</span><span className="leading-relaxed">{trap}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* CTA: ask the tutor */}
            <motion.button whileTap={{ scale: 0.97 }}
              animate={{ boxShadow: [
                "0 10px 30px rgba(245, 158, 11, 0.3)",
                "0 10px 40px rgba(245, 158, 11, 0.5)",
                "0 10px 30px rgba(245, 158, 11, 0.3)",
              ]}}
              transition={{ boxShadow: { duration: 2, repeat: Infinity }}}
              onClick={handleAskTutor}
              className="w-full mt-2 p-5 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 text-white font-bold shadow-xl relative overflow-hidden">
              <div className="relative flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <MessageCircleQuestion size={22} />
                </div>
                <div className="text-left">
                  <div className="text-base font-black">Je comprends pas, explique-moi</div>
                  <div className="text-xs font-medium opacity-90">Le prof t'explique étape par étape</div>
                </div>
              </div>
            </motion.button>

            <p className="text-center text-[11px] text-slate-500 mt-2">💡 Partage avec un camarade qui pourrait avoir besoin</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {imageExpanded && (
          <ImageExpandModal src={capturedImage} onClose={() => setImageExpanded(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
