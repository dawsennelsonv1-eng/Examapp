// src/utils/constants.js
// Clean version with /api endpoints wired in.

export const EXAM_DATE = new Date("2026-07-17T08:00:00");

export const TRACKS = {
  NINE_AF: "9AF",
  NS4: "NS4",
};

export const SUBJECTS_BY_TRACK = {
  [TRACKS.NINE_AF]: [
    "Mathématiques",
    "Physique",
    "Chimie",
    "Sciences Sociales",
    "Français",
    "Créole",
  ],
  [TRACKS.NS4]: [
    "Mathématiques",
    "Physique",
    "Chimie",
    "Biologie",
    "Sciences Sociales",
    "Philosophie",
    "Français",
  ],
};

// ============================================================
// API ENDPOINTS
// All AI features now use Vercel serverless functions at /api/*
// instead of Make.com webhooks. This is simpler, free, and reliable.
// ============================================================

export const WEBHOOKS = {
  // 1. OCR scan — handled inside SOLVE for MVP (Gemini Vision)
  OCR_SCAN: "/api/solve",

  // 2. Solve extracted problem → returns structured solution
  SOLVE: "/api/solve",

  // 3. Classroom tutor chat → conversational reply
  TUTOR_CHAT: "/api/chat",

  // 4. Explain specific step differently → adaptive explanation
  EXPLAIN_STEP: "/api/explain",

  // 5. Generate virtual board SVG → returns SVG code
  GENERATE_BOARD: "/api/board",

  // 6. Generate fresh quiz from past exams
  GENERATE_QUIZ: "/api/quiz",
};

// ============================================================
// LOCAL STORAGE KEYS
// ============================================================

export const STORAGE_KEYS = {
  TRACK: "menfp.track",
  LANG: "menfp.lang",
  THEME: "menfp.theme",
  PROGRESS: "menfp.progress",
  WRONG_ANSWERS: "menfp.wrong",
  PLAN_TIER: "laureat.planTier",
  USAGE_TODAY: "laureat.usageToday",
};

// ============================================================
// PLAN TIERS — usage caps per day
// -1 means unlimited
// ============================================================

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
