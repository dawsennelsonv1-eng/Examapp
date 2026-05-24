// src/utils/constants.js
// Clean version. No template literals, no || fallbacks, no import.meta chains.
// Just plain strings and objects so Vite parses it perfectly.

export const EXAM_DATE = new Date("2026-07-17T08:00:00");

export const TRACKS = {
  NINE_AF: "9AF",
  NS4: "NS4",
};

export const SUBJECTS_BY_TRACK = {
  "9AF": [
    "Mathématiques",
    "Physique",
    "Chimie",
    "Sciences Sociales",
    "Français",
    "Créole",
  ],
  "NS4": [
    "Mathématiques",
    "Physique",
    "Chimie",
    "Biologie",
    "Sciences Sociales",
    "Philosophie",
    "Français",
  ],
};

export const WEBHOOKS = {
  OCR_SCAN: "/api/solve",
  SOLVE: "/api/solve",
  TUTOR_CHAT: "/api/chat",
  EXPLAIN_STEP: "/api/explain",
  GENERATE_BOARD: "/api/board",
  GENERATE_QUIZ: "/api/quiz",
};

export const STORAGE_KEYS = {
  TRACK: "menfp.track",
  LANG: "menfp.lang",
  THEME: "menfp.theme",
  PROGRESS: "menfp.progress",
  WRONG_ANSWERS: "menfp.wrong",
  PLAN_TIER: "laureat.planTier",
  USAGE_TODAY: "laureat.usageToday",
};

export const USAGE_CAPS = {
  free: {
    scans: 3,
    chats: 10,
    boards: 1,
    quizzes: 5,
  },
  basic: {
    scans: 15,
    chats: 50,
    boards: 5,
    quizzes: 20,
  },
  premium: {
    scans: -1,
    chats: -1,
    boards: -1,
    quizzes: -1,
  },
};
