// src/hooks/useProgress.js — v24
// Tracks the student's progress: which events (lessons) they've completed and
// their quiz scores. Stored locally (instant, offline-safe) and, if Supabase is
// configured, mirrored to lesson_views / quiz_attempts for cross-device sync +
// admin metrics. Local is always the source of truth for the UI so it works
// offline; the cloud copy is best-effort.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { logEvent } from "../services/analytics";

const KEY = "laureat.progress.v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null") || base(); }
  catch { return base(); }
}
function base() {
  return { completedEvents: {}, quizScores: [] }; // {eventId:true}, [{id,score,at}]
}
function write(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}

export function useProgress() {
  const [progress, setProgress] = useState(read);

  useEffect(() => { write(progress); }, [progress]);

  const markEventComplete = useCallback((eventId, meta = {}) => {
    if (!eventId) return;
    setProgress((p) => {
      if (p.completedEvents[eventId]) return p;
      return { ...p, completedEvents: { ...p.completedEvents, [eventId]: Date.now() } };
    });
    logEvent("lesson_complete", { event_id: eventId, ...meta });
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) supabase.from("lesson_views").insert({
          user_id: data.user.id, event_id: eventId, completed: true,
        }).then(() => {}, () => {});
      });
    }
  }, []);

  const recordQuizScore = useCallback((quizId, score, meta = {}) => {
    setProgress((p) => ({
      ...p,
      quizScores: [...p.quizScores.slice(-99), { id: quizId, score, at: Date.now() }],
    }));
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) supabase.from("quiz_attempts").insert({
          user_id: data.user.id, quiz_id: quizId || null, score, metadata: meta,
        }).then(() => {}, () => {});
      });
    }
  }, []);

  const completedCount = Object.keys(progress.completedEvents).length;
  const quizAverage = progress.quizScores.length
    ? Math.round(progress.quizScores.reduce((s, q) => s + (q.score || 0), 0) / progress.quizScores.length)
    : null;

  const isEventComplete = useCallback(
    (eventId) => Boolean(progress.completedEvents[eventId]),
    [progress]
  );

  const reset = useCallback(() => setProgress(base()), []);

  return {
    progress,
    completedCount,
    quizAverage,
    quizCount: progress.quizScores.length,
    markEventComplete,
    recordQuizScore,
    isEventComplete,
    reset,
  };
}
