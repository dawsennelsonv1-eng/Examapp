// src/hooks/useClassroom.js
// v8: Tracks last session summary for "Pwofesè remember" feature.

import { useCallback, useEffect, useState } from "react";

const SESSIONS_KEY = "laureat.classroom.sessions";
const LAST_SESSION_SUMMARY_KEY = "laureat.lastSessionSummary";

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useClassroomSessions() {
  const [sessions, setSessions] = useState(() => loadFromStorage());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === SESSIONS_KEY) setSessions(loadFromStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((list) => {
    try {
      const trimmed = list.slice(-30);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
      setSessions(trimmed);
    } catch {}
  }, []);

  const createSession = useCallback(
    ({ subject, title, exercise = null, firstMessage = null, personaId = null }) => {
      const session = {
        id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        subject: subject || "Général",
        title: title || "Nouvelle conversation",
        exercise,
        messages: firstMessage ? [firstMessage] : [],
        boards: [
          { id: "board_enonce", type: "enonce", name: "Énoncé", donnees: [], items: [] },
          { id: "board_solution", type: "solution", name: "Solution", items: [] },
          { id: "board_visuel", type: "visuel", name: "Visuel", svg: null },
        ],
        activeBoardId: "board_enonce",
        currentPersonaId: personaId,
        failCount: 0,
        createdAt: Date.now(),
        lastViewedAt: Date.now(),
      };
      const current = loadFromStorage();
      persist([...current, session]);
      return session;
    },
    [persist]
  );

  const updateSession = useCallback(
    (id, updates) => {
      const current = loadFromStorage();
      const next = current.map((s) =>
        s.id === id ? { ...s, ...updates, lastViewedAt: Date.now() } : s
      );
      persist(next);
      return next.find((s) => s.id === id);
    },
    [persist]
  );

  const appendMessage = useCallback(
    (id, message) => {
      const current = loadFromStorage();
      const next = current.map((s) =>
        s.id === id ? { ...s, messages: [...s.messages, message], lastViewedAt: Date.now() } : s
      );
      persist(next);
      return next.find((s) => s.id === id);
    },
    [persist]
  );

  const deleteSession = useCallback(
    (id) => {
      const current = loadFromStorage();
      persist(current.filter((s) => s.id !== id));
    },
    [persist]
  );

  const getSession = useCallback((id) => loadFromStorage().find((s) => s.id === id), []);

  // PWOFESÈ REMEMBER: capture summary on session close
  const captureSessionSummary = useCallback((session) => {
    if (!session) return;
    const summary = {
      sessionId: session.id,
      subject: session.subject,
      title: session.title,
      lastTopic: session.exercise?.enonce?.substring(0, 100) || session.title,
      lastPersonaId: session.currentPersonaId,
      didComplete: session.currentStep === "done",
      failedAttempts: session.failCount || 0,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(LAST_SESSION_SUMMARY_KEY, JSON.stringify(summary));
    } catch {}
  }, []);

  const getLastSessionSummary = useCallback(() => {
    try {
      const raw = localStorage.getItem(LAST_SESSION_SUMMARY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const sortedSessions = [...sessions].sort((a, b) => b.lastViewedAt - a.lastViewedAt);

  return {
    sessions: sortedSessions,
    createSession,
    updateSession,
    appendMessage,
    deleteSession,
    getSession,
    captureSessionSummary,
    getLastSessionSummary,
  };
}
