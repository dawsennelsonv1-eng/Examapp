// src/hooks/useClassroom.js
// Manages classroom sessions in localStorage.
// Sessions store: exercise data, conversation, board state, current step.

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
      const trimmed = list.slice(-30); // keep last 30 sessions
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
      setSessions(trimmed);
    } catch {}
  }, []);

  const createSession = useCallback(
    ({ subject, title, exercise = null, firstMessage = null }) => {
      const session = {
        id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        subject: subject || "Général",
        title: title || "Nouvelle conversation",
        exercise, // Full exercise data from scan (enonce, donnees, sections)
        messages: firstMessage ? [firstMessage] : [],
        boardState: {
          donnees: [], // Données revealed so far
          activeSection: null,
          activeSteps: [], // Steps revealed in current section
          diagramSvg: null,
        },
        currentStep: "intro", // intro | donnees | section_1 | section_2 | done
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
        s.id === id
          ? { ...s, messages: [...s.messages, message], lastViewedAt: Date.now() }
          : s
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

  const getSession = useCallback((id) => {
    return loadFromStorage().find((s) => s.id === id);
  }, []);

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
