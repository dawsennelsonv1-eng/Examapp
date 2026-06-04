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
  const [synced, setSynced] = useState(false);

  useEffect(() => { write(progress); }, [progress]);

  // One-time pull from the cloud so progress follows the user across devices.
  // Local and cloud are MERGED (union of completed events, concat of scores).
  useEffect(() => {
    if (synced || !supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user || cancelled) return;
        const [{ data: views }, { data: attempts }] = await Promise.all([
          supabase.from("lesson_views").select("event_id, created_at").eq("user_id", u.user.id),
          supabase.from("quiz_attempts").select("quiz_id, score, created_at").eq("user_id", u.user.id).order("created_at", { ascending: true }).limit(100),
        ]);
        if (cancelled) return;
        setProgress((p) => {
          const completedEvents = { ...p.completedEvents };
          (views || []).forEach((v) => {
            if (!completedEvents[v.event_id]) completedEvents[v.event_id] = new Date(v.created_at).getTime();
          });
          // Merge scores by (id+timestamp) signature to avoid duplicates.
          const sig = (q) => `${q.id}_${q.at}`;
          const seen = new Set(p.quizScores.map(sig));
          const cloudScores = (attempts || []).map((a) => ({
            id: a.quiz_id, score: a.score, at: new Date(a.created_at).getTime(),
          })).filter((q) => !seen.has(sig(q)));
          return {
            ...p,
            completedEvents,
            quizScores: [...p.quizScores, ...cloudScores].slice(-100),
          };
        });
      } catch { /* offline / not signed in — local stays authoritative */ }
      finally { if (!cancelled) setSynced(true); }
    })();
    return () => { cancelled = true; };
  }, [synced]);

  const markEventComplete = useCallback((eventId, meta = {}) => {
    if (!eventId) return;
    setProgress((p) => {
      if (p.completedEvents[eventId]) return p;
      return { ...p, completedEvents: { ...p.completedEvents, [eventId]: Date.now() } };
    });
    logEvent("lesson_complete", { event_id: eventId, ...meta });
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) supabase.from("lesson_views").upsert({
          user_id: data.user.id, event_id: eventId, completed: true,
        }, { onConflict: "user_id,event_id", ignoreDuplicates: true }).then(() => {}, () => {});
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
