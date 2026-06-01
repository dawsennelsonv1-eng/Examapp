// src/components/quiz/QuizPlayer.jsx — v23 (Duolingo style done right)
//
// Features:
//   - Heart system (3 hearts, lose one per wrong answer, game over at 0)
//   - Progress bar at top, X button to exit
//   - Big bold question, large tappable options with letter badges
//   - Satisfying feedback: green slide-up "Excellent!" / red slide-up "Pas tout à fait"
//   - Final score screen with score, hearts remaining, retry, ask tutor
//
// Inspired by Duolingo. Made for mobile-first.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, ChevronRight, RotateCcw, X,
  Heart, Sparkles, MessageCircle, Flame, Trophy,
} from "lucide-react";

export default function QuizPlayer({
  title = "Quiz",
  questions = [],
  onComplete,
  onClose,
  onAskTutor,
  contextLabel = "",
}) {
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [hearts, setHearts] = useState(3);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);

  const current = questions[index];
  const progress = total > 0 ? ((index + (feedback ? 1 : 0)) / total) * 100 : 0;
  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const finalScore = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  useEffect(() => {
    setTextAnswer("");
    setFeedback(null);
    setSelectedOption(null);
  }, [index]);

  if (!current && !done) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center text-slate-300">
          <p className="text-sm mb-3">Aucune question disponible.</p>
          <button onClick={onClose} className="text-violet-400 font-bold">Retour</button>
        </div>
      </div>
    );
  }

  const submitAnswer = (correct, answerValue) => {
    const newAnswers = { ...answers, [index]: { correct, answer: answerValue } };
    setAnswers(newAnswers);
    setFeedback(correct ? "correct" : "incorrect");
    if (correct) {
      setStreak(streak + 1);
    } else {
      setStreak(0);
      setHearts(Math.max(0, hearts - 1));
    }
  };

  const handleMultipleChoice = (optionIdx) => {
    if (feedback) return;
    setSelectedOption(optionIdx);
    const correct = optionIdx === current.correctIndex;
    submitAnswer(correct, optionIdx);
  };

  const handleFillBlank = () => {
    if (feedback || !textAnswer.trim()) return;
    const userAns = textAnswer.trim().toLowerCase();
    const expected = String(current.correctAnswer || "").trim().toLowerCase();
    const correct = userAns === expected || userAns.includes(expected) || expected.includes(userAns);
    submitAnswer(correct, textAnswer);
  };

  const nextQuestion = () => {
    if (hearts <= 0 && feedback === "incorrect") {
      setDone(true);
      onComplete?.({ score: finalScore, correctCount, total, answers, failed: true });
      return;
    }
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
    setSelectedOption(null);
    setHearts(3);
    setStreak(0);
    setDone(false);
    setTextAnswer("");
  };

  // ============== FINAL SCORE SCREEN ==============
  if (done) {
    const isWin = hearts > 0 && finalScore >= 60;
    const isPerfect = finalScore === 100;
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        <header className="px-4 py-3 flex justify-end">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
            <X size={18} className="text-slate-300" />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className={`w-36 h-36 rounded-3xl flex items-center justify-center mb-6 shadow-2xl ${
              isPerfect
                ? "bg-gradient-to-br from-amber-300 via-orange-400 to-pink-500 shadow-amber-500/40"
                : isWin
                ? "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 shadow-emerald-500/40"
                : "bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-500/20"
            }`}
          >
            <Trophy size={64} className="text-white drop-shadow-lg" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-4xl font-black text-white text-center mb-2">
              {isPerfect ? "Parfait !" : isWin ? "Bravo !" : "Continue"}
            </h2>
            <p className="text-sm text-slate-400 text-center mb-8">
              {isPerfect ? "Sans aucune erreur 🔥" : isWin ? "Tu maîtrises bien" : "Pratique encore"}
            </p>
          </motion.div>

          {/* Stat cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-2 w-full max-w-sm mb-8"
          >
            <StatCard label="Score" value={`${finalScore}%`} icon={Sparkles} color="violet" />
            <StatCard label="Cœurs" value={`${hearts}/3`} icon={Heart} color="rose" />
            <StatCard label="Série" value={streak} icon={Flame} color="amber" />
          </motion.div>

          <div className="flex gap-3 w-full max-w-sm">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={retry}
              className="flex-1 py-3 rounded-2xl bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />Refaire
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white font-bold text-sm shadow-lg shadow-violet-500/30"
            >
              Continuer
            </motion.button>
          </div>

          {!isWin && onAskTutor && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAskTutor}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-violet-400"
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
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Header: close + progress + hearts */}
      <header className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
            <X size={18} className="text-slate-300" />
          </button>
          {/* Progress bar */}
          <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          {/* Hearts */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-800">
            <Heart size={14} className="text-rose-500 fill-rose-500" />
            <span className="text-sm font-black text-white">{hearts}</span>
          </div>
        </div>
        {contextLabel && (
          <div className="text-[10px] uppercase tracking-widest font-black text-slate-500 px-1">
            {contextLabel}
          </div>
        )}
      </header>

      {/* Question content */}
      <div className="flex-1 px-4 pt-3 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="text-[10px] uppercase tracking-widest font-black text-violet-400 mb-3">
              {current.type === "fill_blank" ? "Complète la phrase" : "Choisis la bonne réponse"}
            </div>
            <h3 className="text-2xl font-black text-white leading-tight mb-7">
              {current.question}
            </h3>

            {/* Multiple choice */}
            {current.type === "multiple_choice" && (
              <div className="space-y-2.5">
                {current.options?.map((opt, oi) => {
                  const isCorrectOpt = oi === current.correctIndex;
                  const showResult = feedback !== null;
                  const isThisOptionSelected = selectedOption === oi;
                  let bg, ring, textColor, badgeBg;
                  if (showResult && isCorrectOpt) {
                    bg = "bg-emerald-500/15"; ring = "ring-emerald-500"; textColor = "text-white"; badgeBg = "bg-emerald-500 text-white";
                  } else if (showResult && isThisOptionSelected && !isCorrectOpt) {
                    bg = "bg-rose-500/15"; ring = "ring-rose-500"; textColor = "text-white"; badgeBg = "bg-rose-500 text-white";
                  } else if (isThisOptionSelected) {
                    bg = "bg-violet-500/15"; ring = "ring-violet-500"; textColor = "text-white"; badgeBg = "bg-violet-500 text-white";
                  } else {
                    bg = "bg-slate-900"; ring = "ring-slate-800"; textColor = "text-slate-200"; badgeBg = "bg-slate-800 text-slate-400";
                  }
                  return (
                    <motion.button
                      key={oi}
                      whileTap={feedback ? {} : { scale: 0.98 }}
                      onClick={() => handleMultipleChoice(oi)}
                      disabled={feedback !== null}
                      className={`w-full p-4 rounded-2xl text-left flex items-center gap-3 ring-2 transition-colors ${bg} ${ring}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0 ${badgeBg}`}>
                        {String.fromCharCode(65 + oi)}
                      </div>
                      <span className={`text-base font-bold ${textColor} flex-1`}>{opt}</span>
                      {showResult && isCorrectOpt && <CheckCircle2 size={20} className="text-emerald-400" />}
                      {showResult && isThisOptionSelected && !isCorrectOpt && <XCircle size={20} className="text-rose-400" />}
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
                  className={`w-full p-4 rounded-2xl text-lg font-bold text-center focus:outline-none focus:ring-2 transition-colors ${
                    feedback === "correct"
                      ? "bg-emerald-500/15 ring-2 ring-emerald-500 text-white"
                      : feedback === "incorrect"
                      ? "bg-rose-500/15 ring-2 ring-rose-500 text-white"
                      : "bg-slate-900 ring-2 ring-slate-800 text-white"
                  }`}
                />
                {!feedback && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFillBlank}
                    disabled={!textAnswer.trim()}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white font-black text-sm shadow-md disabled:opacity-40 disabled:grayscale"
                  >
                    VALIDER
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Feedback drawer */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className={`px-4 pt-4 pb-6 ${
              feedback === "correct"
                ? "bg-emerald-500/10 border-t-4 border-emerald-500"
                : "bg-rose-500/10 border-t-4 border-rose-500"
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                feedback === "correct" ? "bg-emerald-500" : "bg-rose-500"
              }`}>
                {feedback === "correct" ? <CheckCircle2 size={22} className="text-white" /> : <XCircle size={22} className="text-white" />}
              </div>
              <div className="flex-1">
                <div className={`text-lg font-black ${
                  feedback === "correct" ? "text-emerald-300" : "text-rose-300"
                }`}>
                  {feedback === "correct" ? "Excellent !" : "Pas tout à fait"}
                </div>
                {current.explanation && (
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{current.explanation}</p>
                )}
                {feedback === "incorrect" && current.type === "fill_blank" && current.correctAnswer && (
                  <p className="text-xs text-slate-400 mt-1">
                    Bonne réponse : <span className="font-black text-emerald-300">{current.correctAnswer}</span>
                  </p>
                )}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={nextQuestion}
              className={`w-full py-4 rounded-2xl font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg ${
                feedback === "correct"
                  ? "bg-emerald-500 text-white shadow-emerald-500/40"
                  : "bg-rose-500 text-white shadow-rose-500/40"
              }`}
            >
              {index + 1 >= total ? "VOIR LE SCORE" : "CONTINUER"}
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    violet: "from-violet-500 to-indigo-700 text-violet-300",
    rose: "from-rose-500 to-pink-700 text-rose-300",
    amber: "from-amber-500 to-orange-600 text-amber-300",
  };
  return (
    <div className="bg-slate-900 rounded-2xl p-3 ring-1 ring-slate-800 text-center">
      <div className={`w-9 h-9 mx-auto rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center mb-1.5`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="text-lg font-black text-white">{value}</div>
      <div className="text-[9px] uppercase tracking-widest font-bold text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
