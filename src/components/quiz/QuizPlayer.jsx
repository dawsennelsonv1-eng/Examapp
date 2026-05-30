// src/components/quiz/QuizPlayer.jsx v21
// Reusable quiz player. Supports multiple_choice and fill_blank question types.
// Duolingo-style: progress bar, instant feedback, final score with retry.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, ChevronRight, RotateCcw,
  Trophy, X, MessageCircle,
} from "lucide-react";

export default function QuizPlayer({
  title = "Quiz",
  questions = [],
  onComplete,
  onClose,
  onAskTutor,
  contextLabel = "",
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState(null); // null | "correct" | "incorrect"
  const [done, setDone] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");

  const total = questions.length;
  const current = questions[index];
  const progress = total > 0 ? (index / total) * 100 : 0;

  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const finalScore = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  useEffect(() => {
    setTextAnswer("");
    setFeedback(null);
  }, [index]);

  if (!current && !done) {
    return (
      <div className="p-6 text-center text-slate-500">
        <p>Aucune question disponible.</p>
        <button onClick={onClose} className="mt-3 text-violet-600 font-bold">Retour</button>
      </div>
    );
  }

  const submitAnswer = (correct, answerValue) => {
    const newAnswers = { ...answers, [index]: { correct, answer: answerValue } };
    setAnswers(newAnswers);
    setFeedback(correct ? "correct" : "incorrect");
  };

  const handleMultipleChoice = (optionIdx) => {
    if (feedback) return;
    const correct = optionIdx === current.correctIndex;
    submitAnswer(correct, optionIdx);
  };

  const handleFillBlank = () => {
    if (feedback || !textAnswer.trim()) return;
    const userAns = textAnswer.trim().toLowerCase();
    const expected = String(current.correctAnswer || "").trim().toLowerCase();
    // Generous match: exact or contained
    const correct = userAns === expected || userAns.includes(expected) || expected.includes(userAns);
    submitAnswer(correct, textAnswer);
  };

  const nextQuestion = () => {
    if (index + 1 >= total) {
      setDone(true);
      onComplete?.({ score: finalScore, correctCount, total, answers });
    } else {
      setIndex(index + 1);
    }
  };

  const retry = () => {
    setIndex(0);
    setAnswers({});
    setFeedback(null);
    setDone(false);
    setTextAnswer("");
  };

  // ============== FINAL SCORE SCREEN ==============
  if (done) {
    const finalCorrect = Object.values(answers).filter((a) => a.correct).length;
    const finalScoreCalc = total > 0 ? Math.round((finalCorrect / total) * 100) : 0;
    const isWin = finalScoreCalc >= 70;
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col">
        <header className="px-4 py-3 flex items-center justify-end">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <X size={18} className="text-slate-700 dark:text-slate-300" />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className={`w-32 h-32 rounded-3xl flex items-center justify-center mb-6 shadow-xl ${
              isWin
                ? "bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 shadow-amber-500/40"
                : "bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-500/30"
            }`}
          >
            <Trophy size={56} className="text-white" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white text-center mb-1">
              {isWin ? "Bravo !" : "Continue"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
              {isWin ? "Tu maîtrises bien cette leçon" : "Tu peux refaire le quiz pour t'améliorer"}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-800 rounded-3xl px-8 py-6 shadow-md text-center mb-8"
          >
            <div className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-1">Score</div>
            <div className="text-6xl font-black bg-gradient-to-br from-violet-600 to-indigo-700 bg-clip-text text-transparent">
              {finalScoreCalc}%
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              {finalCorrect} bonnes / {total}
            </div>
          </motion.div>

          <div className="flex gap-3 w-full max-w-md">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={retry}
              className="flex-1 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />Refaire
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white font-bold text-sm shadow-lg"
            >
              Terminer
            </motion.button>
          </div>

          {!isWin && onAskTutor && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAskTutor}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-violet-600 dark:text-violet-400"
            >
              <MessageCircle size={14} />Demander au prof
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  // ============== QUESTION SCREEN ==============
  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header with progress */}
      <header className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <X size={18} className="text-slate-700 dark:text-slate-300" />
          </button>
          <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-700"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {index + 1}/{total}
          </span>
        </div>
        {(title || contextLabel) && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
            {contextLabel && <span className="text-violet-600 dark:text-violet-400">{contextLabel} · </span>}
            {title}
          </div>
        )}
      </header>

      {/* Question */}
      <div className="flex-1 px-4 pt-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-[10px] uppercase tracking-widest font-black text-violet-700 dark:text-violet-400 mb-2">
              {current.type === "fill_blank" ? "À compléter" : "Choisis la bonne réponse"}
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-6">
              {current.question}
            </h3>

            {/* Multiple choice */}
            {current.type === "multiple_choice" && (
              <div className="space-y-2.5">
                {current.options?.map((opt, oi) => {
                  const selected = answers[index]?.answer === oi;
                  const isCorrectOpt = oi === current.correctIndex;
                  const showResult = feedback !== null;
                  return (
                    <motion.button
                      key={oi}
                      whileTap={{ scale: feedback ? 1 : 0.98 }}
                      onClick={() => handleMultipleChoice(oi)}
                      disabled={feedback !== null}
                      className={`w-full p-4 rounded-2xl text-left flex items-center gap-3 transition-colors ${
                        showResult && isCorrectOpt
                          ? "bg-emerald-100 dark:bg-emerald-950/40 ring-2 ring-emerald-500"
                          : showResult && selected && !isCorrectOpt
                          ? "bg-red-100 dark:bg-red-950/40 ring-2 ring-red-500"
                          : selected
                          ? "bg-violet-100 dark:bg-violet-950/40 ring-2 ring-violet-500"
                          : "bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 ${
                        showResult && isCorrectOpt
                          ? "bg-emerald-500 text-white"
                          : showResult && selected && !isCorrectOpt
                          ? "bg-red-500 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}>
                        {String.fromCharCode(65 + oi)}
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white flex-1">{opt}</span>
                      {showResult && isCorrectOpt && <CheckCircle2 size={18} className="text-emerald-500" />}
                      {showResult && selected && !isCorrectOpt && <XCircle size={18} className="text-red-500" />}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Fill blank */}
            {current.type === "fill_blank" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFillBlank()}
                  disabled={feedback !== null}
                  placeholder="Tape ta réponse..."
                  autoFocus
                  className={`w-full p-4 rounded-2xl text-base font-semibold focus:outline-none focus:ring-2 transition-colors ${
                    feedback === "correct"
                      ? "bg-emerald-100 dark:bg-emerald-950/40 ring-emerald-500"
                      : feedback === "incorrect"
                      ? "bg-red-100 dark:bg-red-950/40 ring-red-500"
                      : "bg-white dark:bg-slate-800 ring-violet-500"
                  } text-slate-900 dark:text-white`}
                />
                {!feedback && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFillBlank}
                    disabled={!textAnswer.trim()}
                    className="w-full py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm shadow-md disabled:opacity-40"
                  >
                    Valider
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Feedback bar */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className={`px-4 pt-3 pb-6 ${
              feedback === "correct"
                ? "bg-emerald-100 dark:bg-emerald-950/50"
                : "bg-red-100 dark:bg-red-950/50"
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              {feedback === "correct" ? (
                <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle size={22} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className={`text-sm font-black ${
                  feedback === "correct"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-red-700 dark:text-red-300"
                }`}>
                  {feedback === "correct" ? "Bonne réponse !" : "Pas tout à fait"}
                </div>
                {current.explanation && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    {current.explanation}
                  </p>
                )}
                {feedback === "incorrect" && current.type === "fill_blank" && current.correctAnswer && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Réponse: <span className="font-bold text-emerald-700 dark:text-emerald-300">{current.correctAnswer}</span>
                  </p>
                )}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={nextQuestion}
              className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md ${
                feedback === "correct"
                  ? "bg-emerald-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              {index + 1 >= total ? "Voir le score" : "Question suivante"}
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
