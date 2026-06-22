// src/hooks/useClassroom.js
// v18: SHARED store. Previously every component that called useClassroomSessions()
// got its own independent copy of the sessions state, so the Classroom page's copy
// went stale while ClassroomSession saved messages — and a later write from the
// stale copy could wipe them. Now all callers share ONE in-memory store backed by
// localStorage, so saves are consistent everywhere. Also adds saveCallSummary().

import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEYS } from "../utils/constants";

// ---- module-level shared store ----
function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSROOM_SESSIONS);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let store = loadSessions();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEYS.CLASSROOM_SESSIONS, JSON.stringify(store));
  } catch (err) {
    console.warn("Failed to persist sessions:", err);
  }
}

function setStore(updater) {
  store = typeof updater === "function" ? updater(store) : updater;
  persist();
  listeners.forEach((l) => {
    try { l(store); } catch {}
  });
}

export function useClassroomSessions() {
  const [sessions, setLocal] = useState(store);

  // Subscribe to the shared store; re-sync on mount in case it changed before we subscribed.
  useEffect(() => {
    const cb = (next) => setLocal(next);
    listeners.add(cb);
    setLocal(store);
    return () => listeners.delete(cb);
  }, []);

  const createSession = useCallback((data) => {
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newSession = {
      id,
      title: data.title || "Conversation",
      subject: data.subject || "Général",
      exercise: data.exercise || null,
      messages: [],
      boards: data.boards || null,
      activeBoardId: data.activeBoardId || null,
      currentPersonaId: data.personaId || "joseph",
      failCount: 0,
      createdAt: Date.now(),
      lastViewedAt: Date.now(),
    };
    setStore((prev) => [newSession, ...prev]);
    return newSession;
  }, []);

  const getSession = useCallback((id) => store.find((s) => s.id === id) || null, [sessions]); // eslint-disable-line

  const updateSession = useCallback((id, updates) => {
    setStore((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates, lastViewedAt: Date.now() } : s))
    );
  }, []);

  const appendMessage = useCallback((id, message) => {
    setStore((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, messages: [...(s.messages || []), message], lastViewedAt: Date.now() }
          : s
      )
    );
  }, []);

  const deleteSession = useCallback((id) => {
    setStore((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearAllSessions = useCallback(() => setStore([]), []);

  const captureSessionSummary = useCallback((session) => {
    if (!session) return;
    try {
      const summary = {
        sessionId: session.id,
        lastTopic: session.title,
        subject: session.subject,
        lastPersonaId: session.currentPersonaId,
        didComplete: (session.messages?.length || 0) > 6 && (session.failCount || 0) === 0,
        failedAttempts: session.failCount || 0,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEYS.LAST_SESSION_SUMMARY, JSON.stringify(summary));
    } catch (err) {
      console.warn("Failed to capture summary:", err);
    }
  }, []);

  // NEW: persist a call's AI summary so Home can offer "veux-tu continuer ?".
  const saveCallSummary = useCallback(({ sessionId, subject, personaId, topic, summary, didComplete }) => {
    try {
      const payload = {
        sessionId: sessionId || null,
        lastTopic: topic || summary || "Appel avec le prof",
        subject: subject || "Général",
        lastPersonaId: personaId || "joseph",
        didComplete: Boolean(didComplete),
        failedAttempts: 0,
        timestamp: Date.now(),
        summary: summary || "",
        fromCall: true,
      };
      localStorage.setItem(STORAGE_KEYS.LAST_SESSION_SUMMARY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to save call summary:", err);
    }
  }, []);

  const getLastSessionSummary = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LAST_SESSION_SUMMARY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  return {
    sessions,
    createSession,
    getSession,
    updateSession,
    appendMessage,
    deleteSession,
    clearAllSessions,
    captureSessionSummary,
    saveCallSummary,
    getLastSessionSummary,
  };
}
