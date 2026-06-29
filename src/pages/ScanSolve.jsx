// src/pages/ScanSolve.jsx — v25 (solve-the-whole-page)
//
// Flow:
//   1. capture → POST /api/content?task=solve {phase:"extract"} → OCR + subject +
//      every exercise, each tagged type:"problem"|"simple".
//   2. multiple exercises → picker with an obvious "Tout résoudre" button (solves
//      ALL) plus per-exercise tap (solve one).
//   3. solve runs one exercise at a time in the background (safe for serverless
//      timeouts) and reveals each solution as it lands, with progress.
//
// Each solution renders in the format the server produced for THAT exercise:
//   sciences → Données/Solution split          (calculation/problem)
//   choice   → correct answer / why / key facts (fill / choose / define / compare)

import { useState, useEffect } from "react";
import { logUsage } from "../utils/logUsage";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, AlertCircle, Loader2, MessageCircleQuestion, FileDown, Maximize2, Scan, Sparkles,
} from "lucide-react";

import CameraCapture from "../components/scan/CameraCapture";
import ExerciseSelector from "../components/scan/ExerciseSelector";
import VerificationResult from "../components/scan/VerificationResult";
import { KeyFormulas, SummaryCard } from "../components/scan/SolutionExtras";
import CrossMultiplyStep from "../components/scan/CrossMultiplyStep";
import ChoiceSolution from "../components/scan/ChoiceSolution";
import ProduitsEnCroix from "../components/shared/ProduitsEnCroix";
import ImageExpandModal from "../components/shared/ImageExpandModal";
import ShareButton from "../components/shared/ShareButton";

import { useApp } from "../contexts/AppContext";
import { useScanHistory } from "../hooks/useScanHistory";
import { exportSolutionsToPDF } from "../services/pdfService";
import { logEvent } from "../services/analytics";
import { supabase } from "../lib/supabase";
import WhatsAppPayButton from "../components/WhatsAppPayButton";
import AskToPay from "../components/AskToPay";
import FeatureRemaining from "../components/FeatureRemaining";

const API = "/api/content?task=solve";
const MAX_SOLVE_ALL = 12; // cap exercises solved at once (cost control on dense pages)

export default function ScanSolve() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { track } = useApp();
  const { addScan } = useScanHistory();

  const [step, setStep] = useState("camera"); // camera | picker | result | error | limit
  const [scanMode, setScanMode] = useState("solve");
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedText, setCapturedText] = useState(null);

  const [extracted, setExtracted] = useState(null);   // full extract payload
  const [solutions, setSolutions] = useState([]);      // [{index,number,enonce,status,data}]
  const [error, setError] = useState(null);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);

  // Replay a saved scan from history
  useEffect(() => {
    if (searchParams.get("replay") === "1") {
      const raw = sessionStorage.getItem("laureat.scanReplay");
      if (raw) {
        try {
          const scan = JSON.parse(raw);
          sessionStorage.removeItem("laureat.scanReplay");
          setCapturedImage(scan.capturedImage || null);
          setSolutions([{
            index: 0, number: scan.number || 1, enonce: scan.enonce || "",
            status: "done", data: scan,
          }]);
          setStep("result");
        } catch {}
      }
    }
  }, []); // eslint-disable-line

  // ---- Phase 1: EXTRACT (fast) ----
  const runExtract = async ({ imageData, problemText, mode }) => {
    setError(null);
    setSolutions([]);
    setStep("result");          // optimistic: we're about to show progress
    const t0 = Date.now();
    logEvent("scan_start", { mode, input_type: imageData ? "image" : "text" });
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess?.session?.access_token;
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          phase: "extract",
          mode,
          input: { imageData, problemText: problemText || undefined, track: track || "NS4" },
        }),
      });

      if (res.status === 402) {
        const body = await res.json();
        setLimitInfo(body || { message: "Limite atteinte." });
        setStep("limit");
        logEvent("scan_blocked", { reason: "limit_reached" });
        return;
      }
      if (res.status === 401) {
        setError("Reconnecte-toi pour continuer.");
        setStep("error");
        return;
      }
      if (res.status === 422) {
        const body = await res.json();
        setError(body.message || "L'image n'est pas assez claire.");
        setStep("error");
        logEvent("scan_failed", { mode, stage: "extract", reason: "ocr_failed" });
        return;
      }
      if (!res.ok) throw new Error(`Server ${res.status}`);

      const { data } = await res.json();
      setExtracted(data);
      logEvent("scan_extracted", { mode, subject: data?.subject, subject_family: data?.subjectFamily, count: data?.count, extract_ms: Date.now() - t0 });

      // Multiple exercises → let the student pick one OR solve all.
      if (data.multipleExercises && (data.exercises?.length || 0) > 1) {
        setStep("picker");
        return;
      }

      // Single exercise → solve it right away.
      await solveSet(data, [0], mode);
    } catch (err) {
      console.error("Extract error:", err);
      setError("Pas de connexion internet. Vérifie et réessaie.");
      setStep("error");
    }
  };

  // Solve ONE exercise and return its solution data (or null on failure).
  const solveOne = async (extractPayload, index, mode) => {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: "solve",
        mode,
        selectedExerciseIndex: index,
        preExtracted: {
          subject: extractPayload.subject,
          subjectFamily: extractPayload.subjectFamily,
          exercises: extractPayload.exercises,
        },
      }),
    });
    if (!res.ok) throw new Error(`Server ${res.status}`);
    const { data } = await res.json();
    return data;
  };

  // Solve a set of exercises sequentially, revealing each as it lands.
  const solveSet = async (extractPayload, indices, mode) => {
    const exs = extractPayload.exercises || [];
    setStep("result");
    setSolutions(indices.map((idx) => {
      const ex = exs[idx] || {};
      return { index: idx, number: ex.number || idx + 1, enonce: ex.enonce || "", status: "pending", data: null };
    }));

    for (let pos = 0; pos < indices.length; pos++) {
      const idx = indices[pos];
      setSolutions((prev) => prev.map((s, i) => (i === pos ? { ...s, status: "solving" } : s)));
      const t0 = Date.now();
      try {
        const data = await solveOne(extractPayload, idx, mode);
        if (!data) throw new Error("empty");
        setSolutions((prev) => prev.map((s, i) => (i === pos ? { ...s, status: "done", data } : s)));
        logUsage("scan");
        logEvent("scan_complete", {
          mode, subject: extractPayload.subject, subject_family: data?.subjectFamily || null,
          model_used: data?.modelUsed || null, solve_ms: Date.now() - t0,
        });
        if (mode === "solve") {
          addScan({
            enonce: data.enonce,
            subject: extractPayload.subject,
            subjectFamily: data.subjectFamily,   // per-solution family → correct replay
            donnees: data.donnees,
            sections: data.sections,
            traps: data.traps,
            keyFormulas: data.keyFormulas,
            summary: data.summary,
            correctAnswer: data.correctAnswer,
            whyCorrect: data.whyCorrect,
            otherOptions: data.otherOptions,
            keyFacts: data.keyFacts,
            capturedImage,
          });
        }
      } catch (err) {
        console.error("Solve error:", err);
        setSolutions((prev) => prev.map((s, i) => (i === pos ? { ...s, status: "error", data: null } : s)));
        logEvent("scan_failed", { mode, stage: "solve", reason: String(err?.message || "error") });
      }
    }
  };

  const handleCapture = async (imageDataUrl, textInput, mode = "solve") => {
    setCapturedImage(imageDataUrl);
    setCapturedText(textInput || null);
    setScanMode(mode);
    await runExtract({ imageData: imageDataUrl, problemText: textInput, mode });
  };

  const handlePickExercise = (index) => solveSet(extracted, [index], scanMode);
  const handleSolveAll = () => {
    // Bound cost on very dense pages: solve at most the first MAX_SOLVE_ALL.
    const all = (extracted?.exercises || []).map((_, i) => i).slice(0, MAX_SOLVE_ALL);
    solveSet(extracted, all, scanMode);
  };

  const handleRetry = () => {
    setStep("camera");
    setCapturedImage(null);
    setCapturedText(null);
    setExtracted(null);
    setSolutions([]);
    setError(null);
    setLimitInfo(null);
  };

  const askTutorFor = (data) => {
    const exerciseData = {
      enonce: data?.enonce,
      subject: extracted?.subject,
      donnees: data?.donnees,
      sections: data?.sections || data?.correctSolution?.sections,
      keyFormulas: data?.keyFormulas,
      capturedImage,
      timestamp: Date.now(),
    };
    sessionStorage.setItem("laureat.pendingExercise", JSON.stringify(exerciseData));
    logEvent("scan_to_tutor", { subject: extracted?.subject });
    navigate("/classe?new=1");
  };

  const doneSolutions = solutions.filter((s) => s.status === "done").map((s) => s.data);
  const handlePDF = () => exportSolutionsToPDF(doneSolutions, { subject: extracted?.subject, track });
  const solvingCount = solutions.filter((s) => s.status === "solving" || s.status === "pending").length;

  // ====== Camera ======
  if (step === "camera") {
    return <CameraCapture onCapture={handleCapture} onClose={() => navigate("/")} />;
  }

  // ====== Free scan limit reached → pay wall ======
  if (step === "limit") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <header className="px-4 py-3 flex items-center gap-2">
          <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div className="font-bold">Limite atteinte</div>
        </header>
        <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <Scan size={30} className="text-violet-300" />
            </div>
            <h1 className="text-2xl font-black mb-2">Tu as utilisé tes scans gratuits</h1>
            <p className="text-sm text-white/60 leading-relaxed">
              {limitInfo?.message || "Passe à un forfait pour continuer à scanner, jusqu'aux examens."}
            </p>
          </div>
          <div className="space-y-2">
            <WhatsAppPayButton planId="premium" />
            <WhatsAppPayButton planId="basic" />

            {/* Wallet bridge — catch the convinced-but-broke student right here */}
            <AskToPay price={450} className="mt-1" />

            <button onClick={() => navigate("/paywall")}
              className="block w-full text-center text-[12px] text-white/45 underline py-2">
              Voir tous les forfaits
            </button>
            {/* Urgency at the moment of desire */}
            <p className="text-center text-[12px] text-rose-300/90 font-semibold">
              L'examen approche — ne perds pas de temps à rester bloqué.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ====== Picker (multiple exercises) ======
  if (step === "picker" && extracted?.multipleExercises) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
        <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-2">
          <button onClick={handleRetry} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">{extracted.exercises.length} exercices détectés</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{extracted.subject}</div>
          </div>
        </header>

        {/* Obvious "solve everything" button */}
        {scanMode !== "verify" && (
          <div className="px-4 pt-4">
            <motion.button whileTap={{ scale: 0.98 }} onClick={handleSolveAll}
              className="w-full p-4 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-900 text-white shadow-xl flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Sparkles size={22} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-black text-base">Tout résoudre</div>
                <div className="text-xs text-white/80">
                  {extracted.exercises.length > MAX_SOLVE_ALL
                    ? `Résous les ${MAX_SOLVE_ALL} premiers d'un coup`
                    : `Résous les ${extracted.exercises.length} exercices d'un coup`}
                </div>
              </div>
            </motion.button>
            <div className="text-center text-[11px] text-slate-400 mt-3 mb-1">— ou choisis un seul exercice —</div>
          </div>
        )}

        <ExerciseSelector
          exercises={extracted.exercises}
          onSelect={handlePickExercise}
          onSelectAll={handleSolveAll}
        />
      </div>
    );
  }

  // ====== Result (one or many solutions) ======
  const isVerify = scanMode === "verify";
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-900 dark:text-white">{isVerify ? "Vérification" : "Solution"}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {(extracted?.subject || "Général")} · Niveau {track || "NS4"}
          </div>
          <FeatureRemaining feature="scan" unit="scans" refreshSignal={solutions.length} className="mt-0.5" />
        </div>

        {doneSolutions.length > 0 && (
          <>
            <ShareButton
              type="scan_result"
              payload={{ enonce: doneSolutions[0].enonce, donnees: doneSolutions[0].donnees, sections: doneSolutions[0].sections }}
              compact
            />
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
          <button onClick={() => setImageExpanded(true)}
            className="relative w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-md">
            <img src={capturedImage} alt="Exercice" className="w-full max-h-40 object-cover" />
            <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white">
              <Maximize2 size={14} />
            </div>
          </button>
        </div>
      )}

      {/* ERROR (extract-level) */}
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

      {/* Global progress while solving multiple */}
      {step === "result" && solvingCount > 0 && solutions.length > 1 && (
        <div className="px-4 mt-4">
          <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/30 p-4 flex items-center gap-3 ring-1 ring-violet-200 dark:ring-violet-700/40">
            <Loader2 size={18} className="animate-spin text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
              Le prof résout… {solutions.length - solvingCount}/{solutions.length}
            </span>
          </div>
        </div>
      )}

      {/* SOLUTIONS list */}
      {step === "result" && (
        <div className="px-4 mt-4 space-y-4">
          {solutions.map((s, i) => (
            <div key={i}>
              {solutions.length > 1 && (
                <div className="text-[11px] uppercase tracking-widest font-black text-violet-600 dark:text-violet-400 mb-2 mt-2">
                  Exercice {s.number}
                </div>
              )}
              {s.status === "done" ? (
                <SolutionBlock solution={s.data} onAskTutor={() => askTutorFor(s.data)} />
              ) : s.status === "error" ? (
                <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 p-4 ring-1 ring-red-200 dark:ring-red-500/30 text-sm text-red-700 dark:text-red-300">
                  Le prof n'a pas pu résoudre cet exercice.{" "}
                  <button onClick={() => handlePickExercise(s.index)} className="underline font-bold">Réessayer</button>
                </div>
              ) : (
                <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                  {s.enonce && <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">{s.enonce}</p>}
                  <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-semibold">{s.status === "solving" ? "Le prof résout…" : "En attente…"}</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* CTA: ask the tutor (once, at the bottom) */}
          {doneSolutions.length > 0 && (
            <>
              <motion.button whileTap={{ scale: 0.97 }}
                animate={{ boxShadow: [
                  "0 10px 30px rgba(245, 158, 11, 0.3)",
                  "0 10px 40px rgba(245, 158, 11, 0.5)",
                  "0 10px 30px rgba(245, 158, 11, 0.3)",
                ]}}
                transition={{ boxShadow: { duration: 2, repeat: Infinity } }}
                onClick={() => askTutorFor(doneSolutions[0])}
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
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {imageExpanded && (
          <ImageExpandModal src={capturedImage} onClose={() => setImageExpanded(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Per-exercise solution renderer (sciences split OR choice layout) -------
function SolutionBlock({ solution, onAskTutor }) {
  const sections = solution?.sections || solution?.correctSolution?.sections;
  const isVerify = solution?.mode === "verify";
  const family = solution?.subjectFamily || "sciences";
  const isChoice = family === "choice" || solution?.format === "choice";

  return (
    <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
      {/* Énoncé */}
      {solution?.enonce && (
        <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="text-[10px] uppercase tracking-widest font-black text-violet-600 dark:text-violet-400 mb-2">Énoncé</h2>
          <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">{solution.enonce}</p>
        </section>
      )}

      {/* Verify verdict */}
      {isVerify && (
        <VerificationResult
          verdict={solution.verdict}
          verdictScore={solution.verdictScore}
          mistakes={solution.userMistakes || []}
          strengths={solution.userStrengths || []}
          tips={solution.tips || []}
        />
      )}

      {isChoice ? (
        <>
          <ChoiceSolution solution={solution} schema={solution.schemaSvg || null} />
          {solution.summary && <SummaryCard text={solution.summary} />}
          <InlineTutorCTA onClick={onAskTutor} text="Je veux que le prof m'explique" />
        </>
      ) : (
        <>
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
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}
                      className={i < sections.length - 1 ? "pb-4 mb-4 border-b border-slate-100 dark:border-slate-800" : ""}>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-baseline gap-1.5">
                        <span className="text-violet-600 dark:text-violet-400">{section.number}-</span>
                        <span className="italic text-slate-700 dark:text-slate-300">{section.verb}</span>{" "}
                        <span className="text-slate-600 dark:text-slate-400 font-normal">{section.title}</span>
                      </h4>
                      <div className="space-y-1.5 pl-2 font-mono text-xs">
                        {section.steps?.map((s, j) => (
                          s.type === "crossmultiply" ? (
                            <CrossMultiplyStep key={j} step={s} index={j} />
                          ) : s.type === "result" && s.boxed ? (
                            <div key={j} className="my-2 inline-block">
                              <div className="px-3 py-1.5 border-2 border-emerald-500 dark:border-emerald-400 rounded-md bg-emerald-50 dark:bg-emerald-950/30 font-bold text-emerald-700 dark:text-emerald-300">
                                {s.content}
                              </div>
                            </div>
                          ) : s.type === "conversion" ? (
                            <div key={j} className="text-blue-700 dark:text-blue-400 italic">{s.content}</div>
                          ) : (
                            <div key={j} className="text-slate-700 dark:text-slate-300">{s.content}</div>
                          )
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <InlineTutorCTA onClick={onAskTutor} text="Tu n'as pas compris une étape ? Explique-moi" />

          {Array.isArray(solution.produitsEnCroix) && solution.produitsEnCroix.length > 0 && (
            <ProduitsEnCroix data={solution.produitsEnCroix} />
          )}

          <KeyFormulas formulas={solution.keyFormulas} />
          {solution.summary && <SummaryCard text={solution.summary} />}
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
        </>
      )}
    </motion.div>
  );
}

function InlineTutorCTA({ onClick, text = "Explique-moi cette étape" }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 font-bold text-xs ring-1 ring-violet-200 dark:ring-violet-500/30"
    >
      <MessageCircleQuestion size={15} />
      {text}
    </motion.button>
  );
}
