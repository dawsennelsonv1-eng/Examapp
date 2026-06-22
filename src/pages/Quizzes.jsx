// src/pages/Quizzes.jsx
// Redesigned quiz tab:
//   • Home: a "Quiz du jour" mix (5 questions across different subjects) + a
//     beautiful subject grid (subjects come from the admin-managed `subjects` table).
//   • Tree: pick a subject → a Duolingo-style path of levels, easiest → hardest
//     (levels = difficulty 1..5), with soft progression saved in localStorage.
//   • Quiz: plays a set; the current subject is shown at the top; every question
//     has a "Mwen pa konprann" button that opens that chapter's lesson.
// All questions come from the `quizzes` table the admin generator fills.

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Brain, CheckCircle, XCircle, ChevronRight, ChevronLeft,
  RefreshCw, Trophy, BookOpen, Loader2, Lock, Check, Sparkles, HelpCircle, Star,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { supabase } from "../lib/supabase";

const PROG_KEY = "laureat.quizProgress";
const PASS_PCT = 60; // % needed to mark a level complete + unlock the next

const SUBJECT_STYLES = [
  { grad: "from-violet-500 to-indigo-700", soft: "bg-violet-100 dark:bg-violet-500/15", text: "text-violet-600 dark:text-violet-300" },
  { grad: "from-emerald-500 to-teal-600", soft: "bg-emerald-100 dark:bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-300" },
  { grad: "from-amber-500 to-orange-600", soft: "bg-amber-100 dark:bg-amber-500/15", text: "text-amber-600 dark:text-amber-300" },
  { grad: "from-sky-500 to-blue-700", soft: "bg-sky-100 dark:bg-sky-500/15", text: "text-sky-600 dark:text-sky-300" },
  { grad: "from-pink-500 to-rose-600", soft: "bg-pink-100 dark:bg-pink-500/15", text: "text-pink-600 dark:text-pink-300" },
  { grad: "from-fuchsia-500 to-purple-700", soft: "bg-fuchsia-100 dark:bg-fuchsia-500/15", text: "text-fuchsia-600 dark:text-fuchsia-300" },
];
const styleFor = (i) => SUBJECT_STYLES[i % SUBJECT_STYLES.length];
const DIFF_LABEL = { 1: "Très facile", 2: "Facile", 3: "Moyen", 4: "Difficile", 5: "Expert" };

function loadProg() { try { return JSON.parse(localStorage.getItem(PROG_KEY)) || {}; } catch { return {}; } }
function saveProg(p) { try { localStorage.setItem(PROG_KEY, JSON.stringify(p)); } catch {} }

function normalize(row, i) {
  return {
    id: row.id || `${row.chapter_id || row.subject}_${i}`,
    question: row.question,
    options: Array.isArray(row.options) ? row.options : [],
    correct: typeof row.answer === "number" ? row.answer : 0,
    explanation: row.explanation || "",
    topic: row.topic || null,
    subject: row.subject || null,
    chapterId: row.chapter_id || null,
    difficulty: Math.min(5, Math.max(1, Number(row.difficulty) || 1)),
  };
}

export default function Quizzes() {
  const { track } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tk = track || "NS4";

  const [view, setView] = useState("home"); // home | tree | quiz | results
  const [loading, setLoading] = useState(true);
  const [subjectName, setSubjectName] = useState({});   // id -> display name
  const [coverage, setCoverage] = useState({});         // subjectId -> { count, byDiff:{d:{count,ids[]}} }
  const [minimal, setMinimal] = useState([]);           // [{id, subject, difficulty}] for mixing
  const [prog, setProg] = useState(() => loadProg());

  const [activeSubject, setActiveSubject] = useState(null); // {id, name}
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const [ctx, setCtx] = useState(null); // {mix} | {subjectId, name, difficulty}
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Load subject names + quiz coverage for this track.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: subs }, { data: rows }] = await Promise.all([
          supabase.from("subjects").select("id, name").eq("track", tk),
          supabase.from("quizzes").select("id, subject, chapter_id, topic, difficulty").eq("track", tk),
        ]);
        const names = {};
        for (const s of subs || []) names[s.id] = s.name;
        const cov = {};
        const mini = [];
        for (const r of rows || []) {
          const sid = r.subject || "autre";
          const d = Math.min(5, Math.max(1, Number(r.difficulty) || 1));
          if (!cov[sid]) cov[sid] = { count: 0, byDiff: {}, topic: r.topic };
          cov[sid].count += 1;
          if (!cov[sid].byDiff[d]) cov[sid].byDiff[d] = { count: 0, ids: [] };
          cov[sid].byDiff[d].count += 1;
          cov[sid].byDiff[d].ids.push(r.id);
          if (!names[sid]) names[sid] = r.topic || sid; // fallback name
          mini.push({ id: r.id, subject: sid, difficulty: d });
        }
        if (!cancelled) { setSubjectName(names); setCoverage(cov); setMinimal(mini); }
      } catch {
        if (!cancelled) { setSubjectName({}); setCoverage({}); setMinimal([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tk]);


  const subjectsList = Object.keys(coverage).map((id) => ({
    id, name: subjectName[id] || id, count: coverage[id].count,
    diffs: Object.keys(coverage[id].byDiff).map(Number).sort((a, b) => a - b),
  }));

  const fetchByIds = async (ids) => {
    const { data } = await supabase
      .from("quizzes")
      .select("id, question, options, answer, explanation, topic, subject, chapter_id, difficulty")
      .in("id", ids);
    return (data || []).map(normalize).filter((x) => x.question && x.options.length === 4);
  };

  const beginPlay = (qs, context) => {
    if (!qs.length) return;
    setQuestions(qs);
    setCtx(context);
    setCurrentIdx(0); setAnswers({}); setSelectedAnswer(null); setShowExplanation(false);
    setView("quiz");
  };

  // Daily mix: 5 questions spanning as many different subjects as possible.
  const startMix = useCallback(async () => {
    setLoadingQuiz(true);
    try {
      const bySubj = {};
      for (const m of minimal) (bySubj[m.subject] ||= []).push(m.id);
      const subjIds = Object.keys(bySubj).sort(() => Math.random() - 0.5);
      const pick = [];
      // one per subject first (max variety), then fill to 5
      for (const s of subjIds) { if (pick.length >= 5) break; const arr = bySubj[s]; pick.push(arr[Math.floor(Math.random() * arr.length)]); }
      let pool = minimal.map((m) => m.id).filter((id) => !pick.includes(id)).sort(() => Math.random() - 0.5);
      while (pick.length < 5 && pool.length) pick.push(pool.shift());
      const qs = (await fetchByIds(pick)).sort(() => Math.random() - 0.5).slice(0, 5);
      beginPlay(qs, { mix: true });
    } finally { setLoadingQuiz(false); }
  }, [minimal]);

  // Auto-start the daily mix when the Quiz tab opens (once). "Quitter"/results
  // return to the home screen with the subject picker.
  const didAutoStart = useRef(false);
  useEffect(() => {
    if (didAutoStart.current) return;
    if (searchParams.get("subject")) { didAutoStart.current = true; return; } // let deep-link win
    if (!loading && minimal.length) {
      didAutoStart.current = true;
      startMix();
    }
  }, [loading, minimal, startMix, searchParams]);

  // A subject level = all questions of one difficulty for that subject.
  const startLevel = useCallback(async (subjectId, name, difficulty) => {
    setLoadingQuiz(true);
    try {
      const ids = coverage[subjectId]?.byDiff[difficulty]?.ids || [];
      const qs = (await fetchByIds(ids)).sort(() => Math.random() - 0.5).slice(0, 10);
      beginPlay(qs, { subjectId, name, difficulty });
    } finally { setLoadingQuiz(false); }
  }, [coverage]);

  // Deep link: /quiz?subject=<id> opens that subject's tree.
  useEffect(() => {
    const s = searchParams.get("subject");
    if (!s || loading || view !== "home") return;
    if (coverage[s]) {
      setActiveSubject({ id: s, name: subjectName[s] || s });
      setView("tree");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, loading, coverage, subjectName, view, setSearchParams]);

  const submitAnswer = () => {
    if (selectedAnswer === null) return;
    const q = questions[currentIdx];
    setAnswers((p) => ({ ...p, [q.id]: { isCorrect: selectedAnswer === q.correct } }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1); setSelectedAnswer(null); setShowExplanation(false);
    } else {
      // Save progress for subject levels.
      if (ctx && !ctx.mix) {
        const correct = Object.values(answers).filter((a) => a.isCorrect).length
          + (selectedAnswer === questions[currentIdx].correct ? 1 : 0);
        const pct = Math.round((correct / questions.length) * 100);
        setProg((prev) => {
          const np = { ...prev };
          np[ctx.subjectId] = { ...(np[ctx.subjectId] || {}) };
          np[ctx.subjectId][ctx.difficulty] = Math.max(np[ctx.subjectId][ctx.difficulty] || 0, pct);
          saveProg(np);
          return np;
        });
      }
      setView("results");
    }
  };

  const goHome = () => { setView("home"); setActiveSubject(null); setQuestions([]); setCtx(null); };

  const explainThis = () => {
    const q = questions[currentIdx];
    if (q?.subject && q?.chapterId) navigate(`/cours/${q.subject}?chapter=${encodeURIComponent(q.chapterId)}`);
    else if (q?.subject) navigate(`/cours/${q.subject}`);
    else navigate("/cours");
  };

  // ---------------- HOME ----------------
  if (view === "home") {
    return (
      <div className="pb-28">
        <div className="px-4 py-6">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={24} className="text-violet-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quiz</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Entraîne-toi pour l'examen, niveau par niveau</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 size={22} className="animate-spin" /></div>
        ) : subjectsList.length === 0 ? (
          <div className="text-center py-14 px-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center mb-3">
              <BookOpen size={26} className="text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Quiz bientôt disponibles</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Les quiz pour ta classe sont en préparation. Reviens très vite.</p>
          </div>
        ) : (
          <>
            {/* Daily mix */}
            <div className="px-4 mb-6">
              <motion.button whileTap={{ scale: 0.98 }} onClick={startMix} disabled={loadingQuiz}
                className="w-full rounded-3xl p-5 text-white text-left shadow-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-slate-900 relative overflow-hidden disabled:opacity-70">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={18} className="text-amber-300" />
                  <span className="text-[10px] uppercase tracking-widest font-black opacity-90">Quiz du jour</span>
                </div>
                <div className="text-xl font-black mb-1">5 questions mélangées</div>
                <div className="text-sm text-white/75">Plusieurs matières, pour s'échauffer</div>
                {loadingQuiz && <Loader2 size={18} className="animate-spin mt-3" />}
              </motion.button>
            </div>

            {/* Subject grid */}
            <section className="px-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Par matière</h2>
              <div className="grid grid-cols-2 gap-3">
                {subjectsList.map((s, i) => {
                  const st = styleFor(i);
                  return (
                    <motion.button key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setActiveSubject({ id: s.id, name: s.name }); setView("tree"); }}
                      className="rounded-2xl p-4 bg-white dark:bg-slate-800 shadow-sm text-left ring-1 ring-slate-100 dark:ring-slate-700">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${st.grad} flex items-center justify-center mb-2 shadow-md`}>
                        <BookOpen size={20} className="text-white" />
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{s.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{s.diffs.length} niveau{s.diffs.length > 1 ? "x" : ""} · {s.count} Q</div>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    );
  }

  // ---------------- TREE (Duolingo-style levels) ----------------
  if (view === "tree" && activeSubject) {
    const cov = coverage[activeSubject.id] || { byDiff: {} };
    const diffs = Object.keys(cov.byDiff).map(Number).sort((a, b) => a - b);
    const sp = prog[activeSubject.id] || {};
    return (
      <div className="pb-28 min-h-screen">
        <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
          <button onClick={goHome} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <ChevronLeft size={18} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div className="font-bold text-slate-900 dark:text-white">{activeSubject.name}</div>
        </header>

        <div className="px-4 py-8">
          <div className="relative flex flex-col items-center gap-6">
            {/* connecting line */}
            <div className="absolute top-0 bottom-0 w-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
            {diffs.map((d, i) => {
              const prevDone = i === 0 || (sp[diffs[i - 1]] || 0) >= PASS_PCT;
              const unlocked = i === 0 || prevDone;
              const done = (sp[d] || 0) >= PASS_PCT;
              const offset = i % 2 === 0 ? "translate-x-0" : (i % 4 === 1 ? "-translate-x-16" : "translate-x-16");
              return (
                <motion.button key={d} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                  whileTap={{ scale: unlocked ? 0.92 : 1 }}
                  onClick={() => unlocked && startLevel(activeSubject.id, activeSubject.name, d)}
                  disabled={!unlocked || loadingQuiz}
                  className={`relative z-10 ${offset}`}>
                  <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-950 ${
                    done ? "bg-gradient-to-br from-amber-400 to-yellow-500" :
                    unlocked ? "bg-gradient-to-br from-violet-500 to-indigo-700" :
                    "bg-slate-200 dark:bg-slate-800"
                  }`}>
                    {!unlocked ? <Lock size={22} className="text-slate-400" />
                      : done ? <Check size={26} className="text-white" strokeWidth={3} />
                      : <span className="text-2xl font-black text-white">{i + 1}</span>}
                  </div>
                  <div className={`text-center mt-1.5 text-[11px] font-bold ${unlocked ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}`}>
                    {DIFF_LABEL[d] || `Niveau ${d}`}
                  </div>
                  <div className="text-center text-[10px] text-slate-400">{cov.byDiff[d].count} Q</div>
                  {loadingQuiz && <Loader2 size={16} className="animate-spin mx-auto mt-1 text-violet-500" />}
                </motion.button>
              );
            })}
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-8 max-w-xs mx-auto">
            Réussis un niveau ({PASS_PCT}%) pour débloquer le suivant. Du plus facile au plus difficile.
          </p>
        </div>
      </div>
    );
  }

  // ---------------- QUIZ ----------------
  if (view === "quiz") {
    const q = questions[currentIdx];
    const topLabel = ctx?.mix
      ? (subjectName[q.subject] || q.topic || "Mélange")
      : `${activeSubject?.name || subjectName[q.subject] || ""}${ctx?.difficulty ? ` · ${DIFF_LABEL[ctx.difficulty]}` : ""}`;
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
        <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={goHome} className="text-xs font-semibold text-violet-600">Quitter</button>
            <div className="text-xs text-slate-500">{currentIdx + 1} / {questions.length}</div>
          </div>
          {/* Subject shown at the top */}
          <div className="flex items-center gap-1.5 mb-2">
            <Star size={12} className="text-amber-400" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">{topLabel}</span>
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-violet-500 to-indigo-600"
              initial={{ width: 0 }} animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
          </div>
        </header>

        <div className="px-4 mt-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed mb-4">{q.question}</h2>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const isSelected = selectedAnswer === i;
              const isCorrect = i === q.correct;
              const showAsCorrect = showExplanation && isCorrect;
              const showAsWrong = showExplanation && isSelected && !isCorrect;
              return (
                <motion.button key={i} whileTap={{ scale: showExplanation ? 1 : 0.98 }}
                  onClick={() => !showExplanation && setSelectedAnswer(i)} disabled={showExplanation}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                    showAsCorrect ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500" :
                    showAsWrong ? "bg-red-50 dark:bg-red-950/30 border-red-500" :
                    isSelected ? "bg-violet-50 dark:bg-violet-950/30 border-violet-500" :
                    "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      showAsCorrect ? "bg-emerald-500 text-white" : showAsWrong ? "bg-red-500 text-white" :
                      isSelected ? "bg-violet-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>
                      {["A", "B", "C", "D"][i]}
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

          {/* "I don't understand" → opens the chapter's lesson */}
          <button onClick={explainThis}
            className="w-full mt-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-sm font-bold flex items-center justify-center gap-2">
            <HelpCircle size={16} /> Mwen pa konprann — wè leson an
          </button>

          <div className="mt-3">
            {!showExplanation ? (
              <motion.button whileTap={{ scale: 0.97 }} onClick={submitAnswer} disabled={selectedAnswer === null}
                className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold shadow-lg disabled:opacity-50">Valider</motion.button>
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
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200 }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Trophy size={44} className="text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{correctCount} / {questions.length}</h1>
        <p className="text-sm text-slate-500 mb-1">{ctx?.mix ? "Quiz du jour" : `${ctx?.name || ""}${ctx?.difficulty ? ` · ${DIFF_LABEL[ctx.difficulty]}` : ""}`}</p>
        <p className={`text-lg font-semibold ${percentage >= 70 ? "text-emerald-600" : percentage >= 50 ? "text-amber-600" : "text-red-600"}`}>
          {percentage}% — {percentage >= PASS_PCT ? "Bravo !" : "Continue à travailler"}
        </p>
      </div>
      <div className="px-4 space-y-3">
        {!ctx?.mix && activeSubject && (
          <button onClick={() => setView("tree")} className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold shadow-lg flex items-center justify-center gap-2">
            <ChevronRight size={16} />Retour au parcours
          </button>
        )}
        <button onClick={ctx?.mix ? startMix : goHome}
          className="w-full py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold flex items-center justify-center gap-2">
          {ctx?.mix ? <><RefreshCw size={16} />Nouveau mélange</> : "Accueil quiz"}
        </button>
      </div>
    </div>
  );
}
