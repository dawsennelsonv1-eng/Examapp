// src/hooks/useClassroom.js
// Manages classroom sessions (conversations + virtual board) in localStorage.
// Later: migrate to Supabase for cross-device sync.

import { useCallback, useEffect, useState } from "react";

const SESSIONS_KEY = "laureat.classroom.sessions";

export function useClassroomSessions() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
      setSessions(stored);
    } catch {}
  }, []);

  const persist = useCallback((list) => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(list.slice(-50))); // keep last 50
      setSessions(list);
    } catch {}
  }, []);

  const createSession = useCallback(
    ({ subject, title, context = null, firstMessage = null }) => {
      const session = {
        id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        subject: subject || "Général",
        title: title || "Nouvelle conversation",
        context, // { fromStep: "...", problem: "..." } when coming from Scan & Solve
        messages: firstMessage ? [firstMessage] : [],
        boardSvg: null,
        createdAt: Date.now(),
        lastViewedAt: Date.now(),
      };
      persist([...sessions, session]);
      return session;
    },
    [sessions, persist]
  );

  const updateSession = useCallback(
    (id, updates) => {
      const next = sessions.map((s) =>
        s.id === id ? { ...s, ...updates, lastViewedAt: Date.now() } : s
      );
      persist(next);
    },
    [sessions, persist]
  );

  const appendMessage = useCallback(
    (id, message) => {
      const next = sessions.map((s) =>
        s.id === id
          ? { ...s, messages: [...s.messages, message], lastViewedAt: Date.now() }
          : s
      );
      persist(next);
    },
    [sessions, persist]
  );

  const deleteSession = useCallback(
    (id) => {
      persist(sessions.filter((s) => s.id !== id));
    },
    [sessions, persist]
  );

  const getSession = useCallback(
    (id) => sessions.find((s) => s.id === id),
    [sessions]
  );

  // Sort sessions newest-first when exposed
  const sortedSessions = [...sessions].sort((a, b) => b.lastViewedAt - a.lastViewedAt);

  return {
    sessions: sortedSessions,
    createSession,
    updateSession,
    appendMessage,
    deleteSession,
    getSession,
  };
}
