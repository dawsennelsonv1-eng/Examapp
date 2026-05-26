// src/pages/ScanSolve.jsx
// v9: Saves to scan history on successful solve, handles ?replay=1 from home history.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, AlertCircle, Loader2,
  MessageCircleQuestion, FileDown,
} from "lucide-react";
import CameraCapture from "../components/scan/CameraCapture";
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
  const [capturedImage, setCapturedImage] = useState(null);
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState(null);

  // Handle replay from history
  useEffect(() => {
    if (searchParams.get("replay") === "1") {
      const raw = sessionStorage.getItem("laureat.scanReplay");
      if (raw) {
        try {
          const scan = JSON.parse(raw);
          sessionStorage.removeItem("laureat.scanReplay");
          setCapturedImage(scan.capturedImage);
          setSolution({
            enonce: scan.enonce,
            donnees: scan.donnees,
            sections: scan.sections,
            traps: scan.traps || [],
          });
          setStep("solution");
        } catch {}
      }
    }
  }, []);

  const handleCapture = async (imageDataUrl, textInput) => {
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
            problemText: textInput || undefined,
            subject: "Physique",
            track: track || "NS4",
          },
        }),
      });

      if (response.status === 422) {
        const body = await response.json();
        setError(body.message || "L'image n'est pas assez claire. Mete plis limyè epi pwoche kamera a.");
        setStep("error");
        return;
      }
      if (!response.ok) throw new Error(`Server ${response.status}`);

      const result = await response.json();
      if (!result?.data) throw new Error("Invalid response");

      setSolution(result.data);
      setStep("solution");

      // Save to history
      addScan({
        enonce: result.data.enonce,
        donnees: result.data.donnees,
        sections: result.data.sections,
        traps: result.data.traps,
        capturedImage: imageDataUrl,
        subject: "Physique",
      });
    } catch (err) {
      console.error("Solve error:", err);
      setError("Pa gen koneksyon entènèt la. Verifye epi eseye ankò.");
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

  const handlePDF = () => exportSolutionToPDF(solution);

  if (step === "camera") {
    return <CameraCapture onCapture={handleCapture} onClose={() => navigate("/")} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-900 dark:text-white">Solution</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Niveau {track || "NS4"}</div>
        </div>

        {step === "solution" && (
          <>
            <ShareButton type="scan_result" payload={{ enonce: solution.enonce, donnees: solution.donnees, sections: solution.sections }} compact />
            <motion.button whileTap={{ scale: 0.92 }} onClick={handlePDF} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300" title="PDF">
              <FileDown size={16} />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, boxShadow: [
                "0 4px 12px rgba(245, 158, 11, 0.3)",
                "0 4px 20px rgba(245, 158, 11, 0.6)",
                "0 4px 12px rgba(245, 158, 11, 0.3)",
              ]}}
              transition={{ opacity: { duration: 0.3 }, scale: { duration: 0.3 }, boxShadow: { duration: 1.8, repeat: Infinity }}}
              whileTap={{ scale: 0.95 }} onClick={handleAskTutor}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-xs shadow-md">
              <MessageCircleQuestion size={12} /><span>Explique-moi</span>
            </motion.button>
          </>
        )}
      </header>

      {capturedImage && (
        <div className="px-4 pt-4">
          <div className="relative rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-md">
            <img src={capturedImage} alt="Exercice" className="w-full max-h-40 object-cover" />
            {step === "solving" && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <div className="text-white text-center">
                  <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                  <div className="text-sm font-bold">Lecture de l'image...</div>
                  <div className="text-xs opacity-75 mt-1">Le prof analyse</div>
                </div>
              </div>
            )}
            {solution?.ocrModel && <ModelIndicator modelUsed={solution.ocrModel} position="bottom-right" size="xs" />}
          </div>
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
              <button onClick={handleRetry} className="text-xs font-bold text-red-700 dark:text-red-300 underline">Reprendre une photo</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step === "solution" && solution && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-4 mt-4 space-y-4">
            {solution.modelUsed && (
              <div className="flex justify-end">
                <ModelIndicator modelUsed={solution.modelUsed} position="inline" size="xs" />
              </div>
            )}

            <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
              <h2 className="text-[10px] uppercase tracking-widest font-black text-violet-600 dark:text-violet-400 mb-2">Énoncé</h2>
              <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">{solution.enonce}</p>
            </section>

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
                  {solution.sections?.map((section, i) => (
                    <div key={i} className={i < solution.sections.length - 1 ? "pb-4 mb-4 border-b border-slate-100 dark:border-slate-800" : ""}>
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
                    </div>
                  ))}
                </div>
              </div>
            </div>

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

            <motion.button whileTap={{ scale: 0.97 }}
              animate={{ boxShadow: [
                "0 10px 30px rgba(245, 158, 11, 0.3)",
                "0 10px 40px rgba(245, 158, 11, 0.5)",
                "0 10px 30px rgba(245, 158, 11, 0.3)",
              ]}}
              transition={{ boxShadow: { duration: 2, repeat: Infinity }}}
              onClick={handleAskTutor}
              className="w-full mt-2 p-5 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 text-white font-bold shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
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

            <div className="flex gap-2 mt-4">
              <ShareButton type="scan_result" payload={{ enonce: solution.enonce, donnees: solution.donnees, sections: solution.sections }} label="Partager" />
              <motion.button whileTap={{ scale: 0.97 }} onClick={handlePDF}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm">
                <FileDown size={16} />Télécharger PDF
              </motion.button>
            </div>
            <p className="text-center text-[11px] text-slate-500 mt-2">💡 Partage avec un camarade qui pourrait avoir besoin</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
