// src/pages/Quizzes.jsx
// Real quizzes: reads the `quizzes` table the admin generator fills.
// Decks are grouped by chapter (chapter_id / topic); each deck plays its own
// questions. No more localStorage cache or demo bank.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  Brain, CheckCircle, XCircle, ChevronRight,
  RefreshCw, Trophy, BookOpen, AlertCircle, Loader2,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { supabase } from "../lib/supabase";

// Normalize a DB row to the shape the quiz UI expects (answer -> correct).
function normalize(row, i) {
  return {
    id: row.id || `${row.chapter_id || row.subject}_${i}`,
    question: row.question,
    options: Array.isArray(row.options) ? row.options : [],
    correct: typeof row.answer === "number" ? row.answer : 0,
    explanation: row.explanation || "",
    topic: row.topic || null,
    subject: row.subject || null,
  };
}

// A stable key for grouping rows into "decks" (one per chapter).
function deckKey(row) {
  return row.chapter_id || `${row.subject}::${row.topic || ""}`;
}

export default function Quizzes() {
  const { track } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState("subjects"); // subjects | quiz | results
  const [decks, setDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const [selectedDeck, setSelectedDeck] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Load the list of decks (chapters that actually have questions) for the track.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDecks(true);
      try {
        const { data, error } = await supabase
          .from("quizzes")
          .select("chapter_id, subject, topic")
          .eq("track", track || "NS4");
        if (error) throw error;
        const map = new Map();
        for (const row of data || []) {
          const k = deckKey(row);
          if (!map.has(k)) {
            map.set(k, { key: k, chapterId: row.chapter_id || null, subject: row.subject, topic: row.topic, count: 0 });
          }
          map.get(k).count += 1;
        }
        if (!cancelled) setDecks(Array.from(map.values()).sort((a, b) => b.count - a.count));
      } catch {
        if (!cancelled) setDecks([]);
      } finally {
        if (!cancelled) setLoadingDecks(false);
      }
    })();
    return () => { cancelled = true; };
  }, [track]);

  const startQuiz = useCallback(async (deck) => {
    if (!deck) return;
    setLoadingQuiz(true);
    setSelectedDeck(deck);
    try {
      let q = supabase
        .from("quizzes")
        .select("id, question, options, answer, explanation, topic, subject, chapter_id, difficulty")
        .eq("track", track || "NS4");
      if (deck.chapterId) q = q.eq("chapter_id", deck.chapterId);
      else q = q.eq("subject", deck.subject);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || [])
        .map(normalize)
        .filter((x) => x.question && x.options.length === 4);
      // light shuffle, cap at 10
      const picked = rows.sort(() => Math.random() - 0.5).slice(0, 10);
      if (picked.length === 0) {
        setLoadingQuiz(false);
        return;
      }
      setQuestions(picked);
      setCurrentIdx(0);
      setAnswers({});
      setSelectedAnswer(null);
      setShowExplanation(false);
      setView("quiz");
    } catch {
      // stay on the subjects screen on failure
    } finally {
      setLoadingQuiz(false);
    }
  }, [track]);

  // Deep link: /quiz?chapter=<id> auto-starts that deck once decks are loaded.
  useEffect(() => {
    const chapter = searchParams.get("chapter");
    if (!chapter || loadingDecks || view !== "subjects") return;
    const deck = decks.find((d) => d.key === chapter || d.chapterId === chapter);
    if (deck) {
      setSearchParams({}, { replace: true });
      startQuiz(deck);
    }
  }, [searchParams, loadingDecks, decks, view, startQuiz, setSearchParams]);

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
    setSelectedDeck(null);
    setQuestions([]);
    setCurrentIdx(0);
    setAnswers({});
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  // ---------------- SUBJECTS / DECKS ----------------
  if (view === "subjects") {
    return (
      <div className="pb-28">
        <div className="px-4 py-6">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={24} className="text-violet-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quiz d'examen</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Questions générées à partir des examens et du programme officiel
          </p>
        </div>

        <section className="px-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Choisis un chapitre
          </h2>

          {loadingDecks ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center mb-3">
                <BookOpen size={26} className="text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">Quiz bientôt disponibles</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Les quiz pour ta classe sont en préparation. Reviens très vite.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {decks.map((deck, i) => (
                <motion.button
                  key={deck.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startQuiz(deck)}
                  disabled={loadingQuiz}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm text-left disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 flex-shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {deck.topic || deck.subject || "Chapitre"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {deck.count} question{deck.count > 1 ? "s" : ""}
                    </div>
                  </div>
                  {loadingQuiz && selectedDeck?.key === deck.key
                    ? <Loader2 size={18} className="text-slate-400 animate-spin" />
                    : <ChevronRight size={18} className="text-slate-400" />}
                </motion.button>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ---------------- QUIZ ----------------
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
              {q.topic || q.subject || ""}
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
                <p className="text-sm text-slate-900 dark:text-white leading-relaxed">{q.explanation}</p>
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

  // ---------------- RESULTS ----------------
  const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;
  const totalCount = questions.length || 1;
  const percentage = Math.round((correctCount / totalCount) * 100);
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      <div className="px-4 py-8 text-center">
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Trophy size={44} className="text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{correctCount} / {questions.length}</h1>
        <p className="text-sm text-slate-500 mb-1">{selectedDeck?.topic || selectedDeck?.subject || ""}</p>
        <p className={`text-lg font-semibold ${percentage >= 70 ? "text-emerald-600" : percentage >= 50 ? "text-amber-600" : "text-red-600"}`}>
          {percentage}% — {percentage >= 70 ? "Excellent !" : percentage >= 50 ? "Pas mal" : "Continue à travailler"}
        </p>
      </div>
      <div className="px-4 space-y-3">
        <button onClick={() => startQuiz(selectedDeck)} className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold shadow-lg flex items-center justify-center gap-2">
          <RefreshCw size={16} />Refaire le quiz
        </button>
        <button onClick={restart} className="w-full py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold">
          Choisir un autre chapitre
        </button>
      </div>
    </div>
  );
}
