// src/pages/CoursEvent.jsx v21
// Renders a lesson/event detail. Fetches AI-generated content on first visit,
// caches it locally. Shows sections, formulas, examples, key takeaways, then
// the "Quiz" button launches the Duolingo-style player.

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, AlertCircle, Lightbulb,
  BookOpen, Sparkles, CheckCircle2, MessageCircle,
  PlayCircle, RotateCcw,
} from "lucide-react";
import { getSubject, getChapter, getEvent } from "../utils/coursData";
import { fetchLesson, getCachedLesson } from "../hooks/useLessonCache";
import { useApp } from "../contexts/AppContext";
import QuizPlayer from "../components/quiz/QuizPlayer";

export default function CoursEvent() {
  const { subjectId, chapterId, eventId } = useParams();
  const navigate = useNavigate();
  const { track, preferences } = useApp();

  const subject = getSubject(subjectId);
  const chapter = getChapter(subjectId, chapterId);
  const event = getEvent(subjectId, chapterId, eventId);

  const [lesson, setLesson] = useState(() => getCachedLesson(eventId));
  const [loading, setLoading] = useState(!lesson);
  const [error, setError] = useState(null);
  const [quizOpen, setQuizOpen] = useState(false);

  useEffect(() => {
    if (lesson || !event) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { lesson: result } = await fetchLesson({
          subject,
          chapter,
          event,
          track: track || "NS4",
          language: preferences?.language || "fr",
        });
        if (!cancelled) setLesson(result);
      } catch (err) {
        if (!cancelled) setError(err.message || "Pa kapab chaje leson an.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [eventId]);

  const handleAskTutor = () => {
    const exerciseData = {
      enonce: `Aide-moi à comprendre: ${event.title}\n\n${event.summary || ""}`,
      timestamp: Date.now(),
      subject: subject?.name,
    };
    sessionStorage.setItem("laureat.pendingExercise", JSON.stringify(exerciseData));
    navigate("/classe?new=1");
  };

  const handleRegenerate = async () => {
    setLesson(null);
    setLoading(true);
    setError(null);
    // Clear this lesson from cache
    try {
      const raw = localStorage.getItem("laureat.lessonCache.v1");
      if (raw) {
        const cache = JSON.parse(raw);
        delete cache[eventId];
        localStorage.setItem("laureat.lessonCache.v1", JSON.stringify(cache));
      }
    } catch {}
    try {
      const { lesson: result } = await fetchLesson({
        subject, chapter, event,
        track: track || "NS4",
        language: preferences?.language || "fr",
      });
      setLesson(result);
    } catch (err) {
      setError(err.message || "Erè");
    } finally {
      setLoading(false);
    }
  };

  if (!event) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Leçon introuvable.</p>
        <button onClick={() => navigate(`/cours/${subjectId}`)} className="mt-3 text-violet-600 font-bold">Retour</button>
      </div>
    );
  }

  if (event.type === "quiz") {
    // Standalone quiz event (no lesson, just questions from cached prior lessons)
    return <ChapterQuizLauncher subject={subject} chapter={chapter} event={event} onBack={() => navigate(`/cours/${subjectId}`)} />;
  }

  return (
    <div className="pb-28">
      {/* Header */}
      <header className="relative px-4 pt-4 pb-6 text-white rounded-b-3xl shadow-xl" style={{ background: subject?.banner }}>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => navigate(`/cours/${subjectId}`)}
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-80 truncate">
              {subject?.name} · {chapter?.title}
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-black leading-tight">{event.title}</h1>
        <p className="text-xs opacity-90 mt-1">{event.summary}</p>
      </header>

      <main className="px-4 mt-4 space-y-4">
        {loading && (
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-3 text-violet-600 dark:text-violet-400" />
            <div className="text-sm font-bold text-slate-900 dark:text-white">Le prof prépare ta leçon...</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Quelques secondes</div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 ring-1 ring-red-200 dark:ring-red-700/40 flex gap-3">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-sm text-red-900 dark:text-red-200 mb-1">Erè</div>
              <p className="text-xs text-red-700 dark:text-red-300 mb-2">{error}</p>
              <button onClick={handleRegenerate} className="text-xs font-bold text-red-700 dark:text-red-300 underline">
                Réessayer
              </button>
            </div>
          </div>
        )}

        {lesson && !loading && (
          <>
            {/* Intro */}
            {lesson.intro && (
              <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-4 ring-1 ring-violet-200 dark:ring-violet-700/40">
                <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">{lesson.intro}</p>
              </motion.section>
            )}

            {/* Sections */}
            {lesson.sections?.map((sec, i) => (
              <motion.section
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i }}
                className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm"
              >
                <h3 className="font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <BookOpen size={14} className="text-violet-600 dark:text-violet-400" />
                  {sec.heading}
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {sec.content}
                </p>

                {sec.formulas?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {sec.formulas.map((f, fi) => (
                      <div key={fi} className="font-mono text-sm font-bold text-violet-700 dark:text-violet-300 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 inline-block">
                        {f}
                      </div>
                    ))}
                  </div>
                )}

                {sec.example && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-200 dark:ring-emerald-700/40">
                    <div className="text-[10px] uppercase tracking-widest font-black text-emerald-700 dark:text-emerald-400 mb-1">Exemple</div>
                    <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed">{sec.example}</p>
                  </div>
                )}

                {sec.tip && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-200 dark:ring-amber-700/40 flex gap-2">
                    <Lightbulb size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed">{sec.tip}</p>
                  </div>
                )}
              </motion.section>
            ))}

            {/* Key takeaways */}
            {lesson.keyTakeaways?.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-4 ring-1 ring-amber-200 dark:ring-amber-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-amber-600 dark:text-amber-400" />
                  <h3 className="text-[10px] uppercase tracking-widest font-black text-amber-700 dark:text-amber-400">À retenir</h3>
                </div>
                <ul className="space-y-2">
                  {lesson.keyTakeaways.map((kt, i) => (
                    <li key={i} className="text-sm text-slate-900 dark:text-slate-100 flex gap-2 leading-relaxed">
                      <CheckCircle2 size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>{kt}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}

            {/* Quiz launcher */}
            {lesson.miniQuiz?.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setQuizOpen(true)}
                className="w-full mt-2 p-5 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 text-white font-bold shadow-xl flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <PlayCircle size={26} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[10px] uppercase tracking-widest font-black opacity-90">Mini-quiz</div>
                  <div className="font-bold text-base">Teste tes connaissances</div>
                  <div className="text-[11px] opacity-80 mt-0.5">{lesson.miniQuiz.length} questions · Style Duolingo</div>
                </div>
              </motion.button>
            )}

            {/* Ask tutor + Regenerate buttons */}
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleAskTutor}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2">
                <MessageCircle size={16} />Demander au prof
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleRegenerate}
                className="px-4 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center gap-2">
                <RotateCcw size={14} />
              </motion.button>
            </div>
          </>
        )}
      </main>

      <AnimatePresence>
        {quizOpen && lesson?.miniQuiz && (
          <QuizPlayer
            title={event.title}
            contextLabel={`${subject?.name} · ${chapter?.title}`}
            questions={lesson.miniQuiz}
            onClose={() => setQuizOpen(false)}
            onAskTutor={handleAskTutor}
            onComplete={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Chapter-wide quiz (the "Quiz" event at end of each chapter)
function ChapterQuizLauncher({ subject, chapter, event, onBack }) {
  // For now: pull cached mini-quizzes from all events in the chapter and shuffle
  const allQuestions = [];
  for (const ev of chapter?.events || []) {
    if (ev.type === "quiz") continue;
    const cached = getCachedLesson(ev.id);
    if (cached?.miniQuiz) allQuestions.push(...cached.miniQuiz);
  }
  // Shuffle + take 10
  const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 10);

  if (shuffled.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Ouvre d'abord les leçons du chapitre pour générer leurs quiz.
        </p>
        <button onClick={onBack} className="text-violet-600 font-bold">Retour</button>
      </div>
    );
  }

  return (
    <QuizPlayer
      title={`Quiz: ${chapter.title}`}
      contextLabel={subject?.name}
      questions={shuffled}
      onClose={onBack}
      onComplete={() => {}}
    />
  );
}
