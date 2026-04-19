// src/pages/Quizzes.jsx
// Real working quiz feature. Subject picker → MCQ cards → score + cheat sheet.
// Wrong answers are saved to localStorage for the "Last Minute Review" cheat sheet.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, ChevronRight, ArrowLeft, Sparkles,
  Trophy, BookOpen, RefreshCw, Flag,
} from "lucide-react";
import { QUIZ_SUBJECTS, getQuizzesForSubject } from "../data/quizBank";

const WRONG_ANSWERS_KEY = "laureat.wrongAnswers";

export default function Quizzes() {
  const [view, setView] = useState("menu"); // menu | quiz | results | cheatsheet
  const [subject, setSubject] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]);

  const startQuiz = (subjectId) => {
    const qs = getQuizzesForSubject(subjectId);
    if (qs.length === 0) return;
    setSubject(QUIZ_SUBJECTS.find((s) => s.id === subjectId));
    setQuestions(qs);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setResults([]);
    setView("quiz");
  };

  const handleAnswer = (optionIdx) => {
    if (answered) return;
    setSelectedAnswer(optionIdx);
    setAnswered(true);
    const question = questions[currentIdx];
    const isCorrect = optionIdx === question.correct;

    setResults((r) => [...r, { question, chosen: optionIdx, correct: isCorrect }]);

    // Save wrong answers to localStorage for cheat sheet
    if (!isCorrect) {
      try {
        const stored = JSON.parse(localStorage.getItem(WRONG_ANSWERS_KEY) || "[]");
        const filtered = stored.filter((x) => x.id !== question.id);
        filtered.push({ ...question, chosen: optionIdx, timestamp: Date.now() });
        localStorage.setItem(WRONG_ANSWERS_KEY, JSON.stringify(filtered.slice(-50)));
      } catch {}
    }

    // Track total quizzes completed
    try {
      const total = parseInt(localStorage.getItem("laureat.quizzesCompleted") || "0", 10);
      localStorage.setItem("laureat.quizzesCompleted", String(total + 1));
    } catch {}
  };

  const nextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      setView("results");
    } else {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    }
  };

  return (
    <div className="pb-28">
      <AnimatePresence mode="wait">
        {view === "menu" && (
          <MenuView
            key="menu"
            onStart={startQuiz}
            onOpenCheatsheet={() => setView("cheatsheet")}
          />
        )}
        {view === "quiz" && (
          <QuizView
            key="quiz"
            subject={subject}
            question={questions[currentIdx]}
            questionIdx={currentIdx}
            totalQuestions={questions.length}
            selectedAnswer={selectedAnswer}
            answered={answered}
            onAnswer={handleAnswer}
            onNext={nextQuestion}
            onQuit={() => setView("menu")}
          />
        )}
        {view === "results" && (
          <ResultsView
            key="results"
            results={results}
            subject={subject}
            onRestart={() => startQuiz(subject.id)}
            onBack={() => setView("menu")}
          />
        )}
        {view === "cheatsheet" && (
          <CheatSheetView key="cheat" onBack={() => setView("menu")} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────── Menu ─────────────── */

function MenuView({ onStart, onOpenCheatsheet }) {
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WRONG_ANSWERS_KEY) || "[]");
      setWrongCount(stored.length);
    } catch {}
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 py-6"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Quiz
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Teste tes connaissances sur les questions du MENFP
        </p>
      </div>

      {/* Cheat sheet CTA */}
      {wrongCount > 0 && (
        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenCheatsheet}
          className="w-full mb-6 p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 flex items-center gap-4 text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <Sparkles size={24} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">Révision de dernière minute</div>
            <div className="text-xs text-white/80 mt-0.5">
              {wrongCount} question{wrongCount > 1 ? "s" : ""} à retravailler
            </div>
          </div>
          <ChevronRight size={20} />
        </motion.button>
      )}

      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-3">
        Choisis une matière
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {QUIZ_SUBJECTS.map((s, i) => {
          const count = getQuizzesForSubject(s.id).length;
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onStart(s.id)}
              className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm text-left hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">{s.emoji}</div>
              <div className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">
                {s.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {count} question{count > 1 ? "s" : ""}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─────────────── Quiz Flow ─────────────── */

function QuizView({ subject, question, questionIdx, totalQuestions, selectedAnswer, answered, onAnswer, onNext, onQuit }) {
  const isCorrect = answered && selectedAnswer === question.correct;
  const progress = ((questionIdx + 1) / totalQuestions) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 py-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onQuit} className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <ArrowLeft size={16} /> Quitter
        </button>
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {questionIdx + 1} / {totalQuestions}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-6">
        <motion.div
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-600"
        />
      </div>

      {/* Subject badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400">
          {subject.emoji} {subject.name}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Année {question.year}
        </span>
      </div>

      {/* Question */}
      <motion.div
        key={questionIdx}
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm mb-4"
      >
        <h2 className="font-bold text-lg text-slate-900 dark:text-white leading-relaxed">
          {question.question}
        </h2>
      </motion.div>

      {/* Options */}
      <div className="space-y-2.5">
        {question.options.map((option, idx) => {
          const isSelected = selectedAnswer === idx;
          const isRight = idx === question.correct;
          const showCorrect = answered && isRight;
          const showWrong = answered && isSelected && !isRight;

          return (
            <motion.button
              key={idx}
              whileTap={{ scale: answered ? 1 : 0.98 }}
              onClick={() => onAnswer(idx)}
              disabled={answered}
              className={`w-full p-4 rounded-xl border-2 text-left font-medium flex items-center gap-3 transition-all ${
                showCorrect
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-200"
                  : showWrong
                  ? "bg-red-50 dark:bg-red-950/30 border-red-500 text-red-900 dark:text-red-200"
                  : isSelected
                  ? "bg-violet-50 dark:bg-violet-950/30 border-violet-500"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                showCorrect ? "bg-emerald-500 text-white"
                : showWrong ? "bg-red-500 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1 text-sm">{option}</span>
              {showCorrect && <CheckCircle2 size={20} className="text-emerald-600" />}
              {showWrong && <XCircle size={20} className="text-red-600" />}
            </motion.button>
          );
        })}
      </div>

      {/* Explanation + contextual link */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-3"
          >
            <div className={`p-4 rounded-2xl border ${
              isCorrect
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-500/30"
            }`}>
              <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
              }`}>
                {isCorrect ? "✓ Correct !" : "✗ Pas tout à fait"}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {question.explanation}
              </p>
            </div>

            {/* Contextual link to past exam */}
            {question.askedIn && (
              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                📋 Cette question a été posée à l'examen de <strong>{question.askedIn.session} {question.askedIn.year}</strong>
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onNext}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
            >
              {questionIdx + 1 >= totalQuestions ? "Voir les résultats" : "Question suivante"}
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────── Results ─────────────── */

function ResultsView({ results, subject, onRestart, onBack }) {
  const correctCount = results.filter((r) => r.correct).length;
  const percentage = Math.round((correctCount / results.length) * 100);
  const isGood = percentage >= 70;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 py-6"
    >
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
            isGood
              ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
              : "bg-gradient-to-br from-amber-400 to-orange-600"
          }`}
        >
          {isGood ? (
            <Trophy size={44} className="text-white" />
          ) : (
            <BookOpen size={40} className="text-white" />
          )}
        </motion.div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
          {percentage}%
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          {correctCount} sur {results.length} questions correctes
        </p>
      </div>

      <div className={`rounded-2xl p-5 mb-4 text-center ${
        isGood
          ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30"
          : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30"
      }`}>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          {isGood
            ? "Bon travail ! Continue sur cette lancée."
            : "Il reste du chemin. Les questions ratées sont dans ta Révision de dernière minute."}
        </p>
      </div>

      <div className="space-y-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onRestart}
          className="w-full py-3.5 rounded-xl bg-violet-600 text-white font-bold flex items-center justify-center gap-2"
        >
          <RefreshCw size={18} />
          Refaire le quiz
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="w-full py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold"
        >
          Retour au menu
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─────────────── Cheat Sheet ─────────────── */

function CheatSheetView({ onBack }) {
  const [wrong, setWrong] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WRONG_ANSWERS_KEY) || "[]");
      setWrong(stored.reverse()); // newest first
    } catch {}
  }, []);

  const clearAll = () => {
    if (confirm("Effacer toute la révision ?")) {
      localStorage.removeItem(WRONG_ANSWERS_KEY);
      setWrong([]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 py-4"
    >
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <ArrowLeft size={16} /> Retour
        </button>
        {wrong.length > 0 && (
          <button onClick={clearAll} className="text-xs text-red-600 dark:text-red-400 font-semibold">
            Effacer tout
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-amber-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Révision de dernière minute
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Les questions que tu as ratées. Maîtrise-les avant l'examen.
        </p>
      </div>

      {wrong.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-slate-500 dark:text-slate-400">
            Aucune erreur pour l'instant.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Fais quelques quiz, les questions ratées apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {wrong.map((w, i) => (
            <motion.div
              key={w.id + i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm border-l-4 border-amber-500"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {w.subject}
                </span>
                <span className="text-xs text-slate-400">Année {w.year}</span>
              </div>
              <p className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
                {w.question}
              </p>
              <div className="space-y-1 mb-3">
                {w.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`text-xs p-2 rounded-lg flex items-center gap-2 ${
                      idx === w.correct
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold"
                        : idx === w.chosen
                        ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 line-through opacity-60"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <span>{String.fromCharCode(65 + idx)}.</span>
                    <span>{opt}</span>
                    {idx === w.correct && <CheckCircle2 size={14} className="ml-auto" />}
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-lg leading-relaxed">
                💡 {w.explanation}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
