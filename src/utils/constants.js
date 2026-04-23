// src/utils/constants.js

export const EXAM_DATE = new Date("2026-07-17T08:00:00");

export const TRACKS = {
  NINE_AF: "9AF",
  NS4: "NS4",
};

export const SUBJECTS_BY_TRACK = {
  [TRACKS.NINE_AF]: ["Mathématiques", "Physique", "Chimie", "Sciences Sociales", "Français", "Créole"],
  [TRACKS.NS4]: ["Mathématiques", "Physique", "Chimie", "Biologie", "Sciences Sociales", "Philosophie", "Français"],
};

// ============================================================
// MAKE.COM WEBHOOK ENDPOINTS
// ============================================================
// Replace these URLs with your actual Make.com webhook URLs.
// Each scenario should be set up per the specs in /docs/makecom-scenarios/
// You can override these at build time using Vite env vars (VITE_WEBHOOK_*)
// for staging/production separation.

const BASE = import.meta.env?.VITE_WEBHOOK_BASE || "https://hook.make.com";

export const WEBHOOKS = {
  // 1. OCR scan → extract text from photo of exercise
  OCR_SCAN:         import.meta.env?.VITE_WEBHOOK_OCR         || `${BASE}/REPLACE-WITH-OCR-SCAN-HOOK`,
  // 2. Solve extracted problem → returns structured solution
  SOLVE:            "/api/solve",       || `${BASE}/REPLACE-WITH-SOLVE-HOOK`,
  // 3. Classroom tutor chat → conversational reply
  TUTOR_CHAT:       import.meta.env?.VITE_WEBHOOK_CHAT        || `${BASE}/REPLACE-WITH-CHAT-HOOK`,
  // 4. Explain specific step differently → adaptive explanation
  EXPLAIN_STEP:     import.meta.env?.VITE_WEBHOOK_EXPLAIN     || `${BASE}/REPLACE-WITH-EXPLAIN-HOOK`,
  // 5. Generate virtual board SVG → returns SVG code
  GENERATE_BOARD:   import.meta.env?.VITE_WEBHOOK_BOARD       || `${BASE}/REPLACE-WITH-BOARD-HOOK`,
  // 6. Generate fresh quiz from past exams
  GENERATE_QUIZ:    import.meta.env?.VITE_WEBHOOK_QUIZ        || `${BASE}/REPLACE-WITH-QUIZ-HOOK`,
};

export const STORAGE_KEYS = {
  TRACK: "menfp.track",
  LANG: "menfp.lang",
  THEME: "menfp.theme",
  PROGRESS: "menfp.progress",
  WRONG_ANSWERS: "menfp.wrong",
  PLAN_TIER: "laureat.planTier", // free | basic | premium
  USAGE_TODAY: "laureat.usageToday",
};

// Daily usage caps per plan (Tier 3B will enforce these server-side too)
export const USAGE_CAPS = {
  free:    { scans: 3,  chats: 10,  boards: 1,  quizzes: 5 },
  basic:   { scans: 15, chats: 50,  boards: 5,  quizzes: 20 },
  premium: { scans: -1, chats: -1,  boards: -1, quizzes: -1 }, // -1 = unlimited
};
