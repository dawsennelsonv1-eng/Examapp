// src/hooks/useClassroom.js
// Manages classroom sessions in localStorage.
// FIX: properly re-loads on every render so state stays in sync between
// Classroom.jsx and ClassroomSession.jsx.

import { useCallback, useEffect, useState } from "react";

const SESSIONS_KEY = "laureat.classroom.sessions";

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useClassroomSessions() {
  const [sessions, setSessions] = useState(() => loadFromStorage());

  // Re-sync from storage when other components modify it
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === SESSIONS_KEY) {
        setSessions(loadFromStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((list) => {
    try {
      // keep last 50 sessions to avoid localStorage bloat
      const trimmed = list.slice(-50);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
      setSessions(trimmed);
    } catch {}
  }, []);

  const createSession = useCallback(
    ({ subject, title, context = null, firstMessage = null }) => {
      const session = {
        id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        subject: subject || "Général",
        title: title || "Nouvelle conversation",
        context,
        messages: firstMessage ? [firstMessage] : [],
        boardSvg: null,
        createdAt: Date.now(),
        lastViewedAt: Date.now(),
      };
      // Read fresh to avoid stale state
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
    },
    [persist]
  );

  const appendMessage = useCallback(
    (id, message) => {
      const current = loadFromStorage();
      const next = current.map((s) =>
        s.id === id
          ? { ...s, messages: [...s.messages, message], lastViewedAt: Date.now() }
          : s
      );
      persist(next);
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

  const getSession = useCallback(
    (id) => {
      // Always read fresh so newly-appended messages show up
      return loadFromStorage().find((s) => s.id === id);
    },
    []
  );

  // Sort newest-first
  const sortedSessions = [...sessions].sort(
    (a, b) => b.lastViewedAt - a.lastViewedAt
  );

  return {
    sessions: sortedSessions,
    createSession,
    updateSession,
    appendMessage,
    deleteSession,
    getSession,
  };
}
