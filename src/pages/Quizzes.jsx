// src/pages/Quizzes.jsx
// Quiz feature using AI-generated questions from /admin uploads.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, CheckCircle, XCircle, ChevronRight,
  RefreshCw, Trophy, BookOpen, AlertCircle,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { getQuizzesForSubject } from "../services/quizService";
import { SUBJECTS_BY_TRACK } from "../utils/constants";

export default function Quizzes() {
  const { track } = useApp();
  const [view, setView] = useState("subjects");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const subjects = SUBJECTS_BY_TRACK[track || "NS4"] || [];

  const startQuiz = (subject) => {
    const cached = getQuizzesForSubject(subject);
    if (!cached || cached.length === 0) {
      alert(`Quiz pour ${subject} pas encore généré. Reviens dans quelques heures.`);
      return;
    }
    const shuffled = [...cached].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);
    setSelectedSubject(subject);
    setCurrentIdx(0);
    setAnswers({});
    setSelectedAnswer(null);
    setShowExplanation(false);
    setView("quiz");
  };

  const submitAnswer = () => {
    if (selectedAnswer === null) return;
    const q = questions[currentIdx];
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { selected: selectedAnswer, correct: q.correct, isCorrect: selectedAnswer === q.correct },
    }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setView("results");
    }
  };

  const restart = () => {
    setView("subjects");
    setSelectedSubject(null);
    setQuestions([]);
    setCurrentIdx(0);
    setAnswers({});
  };

  if (view === "subjects") {
    return (
      <div className="pb-28">
        <div className="px-4 py-6">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={24} className="text-violet-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quiz d'examen</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Inspirés des examens MENFP des 3 dernières années
          </p>
        </div>
        <section className="px-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Choisis une matière
          </h2>
          <div className="space-y-2">
            {subjects.map((subject, i) => {
              const cached = getQuizzesForSubject(subject);
              const available = cached && cached.length > 0;
              return (
                <motion.button
                  key={subject}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => available && startQuiz(subject)}
                  disabled={!available}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm text-left ${!available ? "opacity-50" : ""}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 flex-shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">{subject}</div>
                    <div className="text-xs text-slate-500">
                      {available ? `${cached.length} questions disponibles` : "Pas encore généré"}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </motion.button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  if (view === "quiz") {
    const q = questions[currentIdx];
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
        <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={restart} className="text-xs font-semibold text-violet-600">Quitter</button>
            <div className="text-xs text-slate-500">{currentIdx + 1} / {questions.length}</div>
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>
        </header>
        <div className="px-4 mt-6">
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
              {selectedSubject} {q.askedIn?.year ? `· ${q.askedIn.year}` : ""}
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
              {q.question}
            </h2>
          </div>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const isSelected = selectedAnswer === i;
              const isCorrect = i === q.correct;
              const showAsCorrect = showExplanation && isCorrect;
              const showAsWrong = showExplanation && isSelected && !isCorrect;
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: showExplanation ? 1 : 0.98 }}
                  onClick={() => !showExplanation && setSelectedAnswer(i)}
                  disabled={showExplanation}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                    showAsCorrect ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500" :
                    showAsWrong ? "bg-red-50 dark:bg-red-950/30 border-red-500" :
                    isSelected ? "bg-violet-50 dark:bg-violet-950/30 border-violet-500" :
                    "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      showAsCorrect ? "bg-emerald-500 text-white" :
                      showAsWrong ? "bg-red-500 text-white" :
                      isSelected ? "bg-violet-500 text-white" :
                      "bg-slate-100 dark:bg-slate-700 text-slate-600"
                    }`}>
                      {["A","B","C","D"][i]}
                    </div>
                    <div className="text-sm leading-relaxed flex-1 text-slate-900 dark:text-white">{opt}</div>
                    {showAsCorrect && <CheckCircle size={20} className="text-emerald-500" />}
                    {showAsWrong && <XCircle size={20} className="text-red-500" />}
                  </div>
                </motion.button>
              );
            })}
          </div>
          <AnimatePresence>
            {showExplanation && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
                <div className="text-xs uppercase font-bold text-slate-500 mb-2">Explication</div>
                <p className="text-sm text-slate-900 dark:text-white leading-relaxed mb-3">{q.explanation}</p>
                {q.trap && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span><b>Piège typique:</b> {q.trap}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-6">
            {!showExplanation ? (
              <motion.button whileTap={{ scale: 0.97 }} onClick={submitAnswer} disabled={selectedAnswer === null}
                className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold shadow-lg disabled:opacity-50">
                Valider
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.97 }} onClick={nextQuestion}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white font-bold shadow-lg">
                {currentIdx < questions.length - 1 ? "Question suivante" : "Voir les résultats"}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;
  const totalCount = questions.length;
  const percentage = Math.round((correctCount / totalCount) * 100);
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      <div className="px-4 py-8 text-center">
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Trophy size={44} className="text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{correctCount} / {totalCount}</h1>
        <p className="text-sm text-slate-500 mb-1">{selectedSubject}</p>
        <p className={`text-lg font-semibold ${percentage >= 70 ? "text-emerald-600" : percentage >= 50 ? "text-amber-600" : "text-red-600"}`}>
          {percentage}% — {percentage >= 70 ? "Excellent !" : percentage >= 50 ? "Pas mal" : "Continue à travailler"}
        </p>
      </div>
      <div className="px-4 space-y-3">
        <button onClick={() => startQuiz(selectedSubject)} className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold shadow-lg flex items-center justify-center gap-2">
          <RefreshCw size={16} />Refaire le quiz
        </button>
        <button onClick={restart} className="w-full py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold">
          Choisir une autre matière
        </button>
      </div>
    </div>
  );
}
