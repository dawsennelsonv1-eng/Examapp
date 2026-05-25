// src/utils/constants.js
// Clean constants file with all needed keys for v6.

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
  EXPLAIN_STEP: "/api/chat",
  GENERATE_BOARD: "/api/board",
  GENERATE_QUIZ: "/api/generate-quizzes",
  TTS: "/api/tts",
  PAYMENT_VALIDATE: "/api/payment-webhook",
};

export const STORAGE_KEYS = {
  TRACK: "menfp.track",
  LANG: "menfp.lang",
  THEME: "menfp.theme",
  PROGRESS: "menfp.progress",
  WRONG_ANSWERS: "menfp.wrong",
  PLAN_TIER: "laureat.planTier",
  USAGE_TODAY: "laureat.usageToday",
  PREFERENCES: "laureat.preferences",
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

export const PLAN_PRICES = {
  basic: 900,
  premium: 2400,
};

export const PERSONALITIES = [
  {
    id: "patient",
    name: "Prof. Patient",
    description: "Prend son temps, beaucoup d'exemples concrets",
    icon: "🌱",
  },
  {
    id: "classique",
    name: "Prof. Classique",
    description: "Rigoureux, méthodique, exigeant",
    icon: "📐",
  },
  {
    id: "ami",
    name: "Prof. Ami",
    description: "Chaleureux, casual, des blagues légères",
    icon: "🤝",
  },
  {
    id: "efficace",
    name: "Prof. Efficace",
    description: "Direct, sans fluff, va droit au but",
    icon: "⚡",
  },
];

export const LANGUAGE_OPTIONS = [
  {
    id: "mix",
    name: "Mélange français-créole",
    description: "Recommandé",
    badge: "Recommandé",
    icon: "🇭🇹",
  },
  {
    id: "fr",
    name: "Français",
    description: "Uniquement français",
    icon: "🇫🇷",
  },
  {
    id: "kr",
    name: "Kreyòl",
    description: "Sèlman kreyòl",
    icon: "🗣️",
  },
];
