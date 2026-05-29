// src/utils/constants.js (v17 — exam dates corrected, MENFP wording removed)
// Only the exam-related + persona descriptions changed. Everything else preserved.

export const EXAM_DATES = {
  "9AF": {
    label: "9ème AF",
    fullLabel: "9ème Année Fondamentale",
    start: new Date("2026-06-29T08:00:00"),
    end: new Date("2026-07-02T17:00:00"),
    range: "29 juin – 2 juillet",
  },
  NS4: {
    label: "NS4",
    fullLabel: "Nouveau Secondaire 4",
    start: new Date("2026-07-03T08:00:00"),
    end: new Date("2026-07-07T17:00:00"),
    range: "3 – 7 juillet",
  },
};

// Earliest start across all tracks — used for the home countdown
export const EXAM_DATE = EXAM_DATES["9AF"].start;

export const PERSONALITIES = [
  {
    id: "joseph",
    name: "M. Joseph",
    title: "Le professeur vétéran",
    description: "Patient, sage, méthodique. Comme un grand-père qui enseigne.",
    voiceId: "Achernar",
    icon: "👨‍🏫",
  },
  {
    id: "tikens",
    name: "Ti-Kens",
    title: "Le grand frère cool",
    description: "Énergique, motivant. Comme un ami qui sait tout.",
    voiceId: "Puck",
    icon: "🎧",
  },
  {
    id: "victoria",
    name: "Mlle. Victoria",
    title: "La mentore brillante",
    description: "Élégante, inspirante. Elle valide ton intelligence.",
    voiceId: "Aoede",
    icon: "✨",
  },
  {
    id: "marckenson",
    name: "M. Marckenson",
    title: "Le coach intense",
    description: "Direct, motivant. Il te pousse à donner ton maximum.",
    voiceId: "Charon",
    icon: "🎯",
  },
  {
    id: "camille",
    name: "Mlle. Camille",
    title: "La grande sœur bienveillante",
    description: "Douce, patiente. Un espace safe pour apprendre.",
    voiceId: "Leda",
    icon: "💝",
  },
];

export const LANGUAGE_OPTIONS = [
  { id: "fr",  name: "Français",         description: "Réponses en français uniquement",      icon: "🇫🇷" },
  { id: "kr",  name: "Kreyòl",           description: "Repons yo nan kreyòl sèlman",          icon: "🇭🇹" },
  { id: "mix", name: "Mixte",            description: "Français + kreyòl naturellement",      icon: "🌍" },
];

export const STORAGE_KEYS = {
  ONBOARDING: "laureat.onboardingComplete",
  PREFERENCES: "laureat.preferences",
  TRACK: "laureat.track",
  THEME: "laureat.theme",
  USAGE: "laureat.usage",
  PLAN: "laureat.plan",
  SCAN_HISTORY: "laureat.scanHistory",
  CLASSROOM_SESSIONS: "laureat.classroom.sessions",
  LAST_SESSION_SUMMARY: "laureat.lastSessionSummary",
  TUTORIAL_SEEN: "laureat.tutorialSeen",
};

export const BOARD_TYPES = ["enonce", "solution", "visuel"];

export const HIGHLIGHT_COLORS = {
  yellow: "#fde047",
  pink:   "#f9a8d4",
  green:  "#86efac",
  red:    "#fca5a5",
  blue:   "#93c5fd",
};
