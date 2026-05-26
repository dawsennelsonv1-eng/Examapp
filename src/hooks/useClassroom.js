// src/hooks/useClassroom.js
// Wave 2: Sessions store boards state, persona switches, activeBoardId.

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
