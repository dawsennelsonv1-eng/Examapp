// src/hooks/useClassroom.js
// v17: Added deleteSession() + clearAllSessions() for the new "delete" UX.

import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEYS } from "../utils/constants";

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSROOM_SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEYS.CLASSROOM_SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.warn("Failed to persist sessions:", err);
  }
}

export function useClassroomSessions() {
  const [sessions, setSessions] = useState(() => loadSessions());

  useEffect(() => {
    persistSessions(sessions);
  }, [sessions]);

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
    setSessions((prev) => [newSession, ...prev]);
    return newSession;
  }, []);

  const getSession = useCallback(
    (id) => sessions.find((s) => s.id === id) || null,
    [sessions]
  );

  const updateSession = useCallback((id, updates) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, ...updates, lastViewedAt: Date.now() } : s
      )
    );
  }, []);

  const appendMessage = useCallback((id, message) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, messages: [...(s.messages || []), message], lastViewedAt: Date.now() }
          : s
      )
    );
  }, []);

  // NEW v17: delete a single session
  const deleteSession = useCallback((id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // NEW v17: clear all sessions
  const clearAllSessions = useCallback(() => {
    setSessions([]);
  }, []);

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
    getLastSessionSummary,
  };
}
