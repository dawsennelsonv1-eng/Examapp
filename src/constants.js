// src/utils/constants.js

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

// Simulated webhook endpoints — swap with real Make.com/n8n URLs
export const WEBHOOKS = {
  SOLVE: "https://hook.make.com/menfp-solve-claude",
  EXPLAIN_DIFFERENTLY: "https://hook.make.com/menfp-explain-alt",
  QUIZ_GENERATE: "https://hook.make.com/menfp-quiz-gen",
  OCR_SCAN: "https://hook.make.com/menfp-ocr",
};

export const STORAGE_KEYS = {
  TRACK: "menfp.track",
  LANG: "menfp.lang",
  THEME: "menfp.theme",
  PROGRESS: "menfp.progress",
  WRONG_ANSWERS: "menfp.wrong",
};
