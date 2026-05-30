// src/pages/ReviserQuiz.jsx v21
// Launches a weekly quiz. Generates questions on first visit, caches them.
// Wraps QuizPlayer.

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { WEEKLY_QUIZZES } from "../utils/reviserData";
import QuizPlayer from "../components/quiz/QuizPlayer";
import { useApp } from "../contexts/AppContext";

export default function ReviserQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { track, preferences } = useApp();

  const quizMeta = WEEKLY_QUIZZES.find((q) => q.id === quizId);

  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!quizMeta) {
      setError("Quiz introuvable.");
      setLoading(false);
      return;
    }

    // Try cached first
    const cacheKey = `laureat.quizCache.${quizId}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.questions?.length) {
          setQuestions(cached.questions);
          setLoading(false);
          return;
        }
      }
    } catch {}

    // Otherwise generate
    (async () => {
      try {
        const response = await fetch("/api/lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: { name: quizMeta.subject },
            chapter: { title: quizMeta.title },
            event: {
              id: quizId,
              title: quizMeta.title,
              summary: `Quiz hebdomadaire. Référence: examen ${quizMeta.referencedExam.year}, ${quizMeta.referencedExam.exercise}, niveau ${quizMeta.referencedExam.track}. ${quizMeta.questionCount} questions.`,
            },
            track: track || quizMeta.referencedExam.track,
            language: preferences?.language || "fr",
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { data } = await response.json();
        const qs = data?.miniQuiz || [];
        if (qs.length === 0) throw new Error("Aucune question générée");

        setQuestions(qs);
        try { localStorage.setItem(cacheKey, JSON.stringify({ questions: qs, cachedAt: Date.now() })); } catch {}
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={36} className="animate-spin mx-auto mb-3 text-violet-600 dark:text-violet-400" />
          <div className="text-sm font-bold text-slate-900 dark:text-white">Préparation du quiz...</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Quelques secondes</div>
        </div>
      </div>
    );
  }

  if (error || !questions) {
    return (
      <div className="p-6 text-center pt-20">
        <p className="text-sm text-red-600 mb-3">{error || "Erreur."}</p>
        <button onClick={() => navigate("/reviser")} className="text-violet-600 font-bold">Retour</button>
      </div>
    );
  }

  return (
    <QuizPlayer
      title={quizMeta?.title}
      contextLabel={`Quiz hebdomadaire`}
      questions={questions}
      onClose={() => navigate("/reviser")}
      onComplete={() => {}}
    />
  );
}
