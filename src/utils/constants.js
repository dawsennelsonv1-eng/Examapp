// src/utils/constants.js
// Exhaustive exports — covers every constant name the codebase has ever used.
// If a file imports something that doesn't exist here, add it.

// ===== EXAM DATES =====
// Sourced from trackConfig.js (single source of truth) so dates can never disagree
// across the homepage, exam list, and countdowns.
import { TRACK_CONFIG } from "./trackConfig";

export const EXAM_DATES = {
  "9AF": {
    label: TRACK_CONFIG["9AF"].label,
    fullLabel: TRACK_CONFIG["9AF"].fullLabel,
    start: TRACK_CONFIG["9AF"].examStart,
    end: TRACK_CONFIG["9AF"].examEnd,
    range: TRACK_CONFIG["9AF"].examRange,
  },
  NS4: {
    label: TRACK_CONFIG.NS4.label,
    fullLabel: TRACK_CONFIG.NS4.fullLabel,
    start: TRACK_CONFIG.NS4.examStart,
    end: TRACK_CONFIG.NS4.examEnd,
    range: TRACK_CONFIG.NS4.examRange,
  },
};

export const EXAM_DATE = EXAM_DATES["9AF"].start;

// ===== TRACKS =====
export const TRACKS = [
  { id: "9AF", label: "9ème AF", fullLabel: "9ème Année Fondamentale", examDate: EXAM_DATES["9AF"].start, examRange: EXAM_DATES["9AF"].range },
  { id: "NS4", label: "NS4",     fullLabel: "Nouveau Secondaire 4",    examDate: EXAM_DATES.NS4.start,    examRange: EXAM_DATES.NS4.range },
];

export const TRACK_IDS = ["9AF", "NS4"];

// ===== PLAN TIERS + PRICING =====
export const PLAN_TIERS = {
  FREE: "free",
  BASIC: "basic",
  PREMIUM: "premium",
};

export const PLAN_PRICES = {
  basic: 900,
  premium: 2400,
};

export const PLAN_PRICES_HTG = PLAN_PRICES; // alias

// ===== USAGE LIMITS =====
export const USAGE_CAPS = {
  free: {
    scans_per_day: 3,
    chat_messages_per_day: 10,
    tts_per_day: 5,
    voice_call_minutes_per_day: 0,
    camera_scans_per_day: 0,
    verification_scans_per_day: 0,
    past_exams_unlocked_before_year: 2022,
    weekly_quizzes_per_week: 1,
    // legacy field name compatibility
    dailyScans: 3,
    dailyChats: 10,
  },
  basic: {
    scans_per_day: 20,
    chat_messages_per_day: -1,
    tts_per_day: -1,
    voice_call_minutes_per_day: 0,
    camera_scans_per_day: 20,
    verification_scans_per_day: 5,
    past_exams_unlocked_before_year: 2022,
    weekly_quizzes_per_week: -1,
    dailyScans: 20,
    dailyChats: -1,
  },
  premium: {
    scans_per_day: -1,
    chat_messages_per_day: -1,
    tts_per_day: -1,
    voice_call_minutes_per_day: -1,
    camera_scans_per_day: -1,
    verification_scans_per_day: -1,
    past_exams_unlocked_before_year: 9999,
    weekly_quizzes_per_week: -1,
    dailyScans: -1,
    dailyChats: -1,
  },
};

export const DAILY_LIMITS = USAGE_CAPS; // alias for older naming

// ===== PERSONALITIES =====
export const PERSONALITIES = [
  { id: "joseph",     name: "M. Joseph",     title: "Le professeur vétéran",          description: "Patient, sage, méthodique. Comme un grand-père qui enseigne.", voiceId: "Achernar", icon: "👨‍🏫" },
  { id: "tikens",     name: "Ti-Kens",       title: "Le grand frère cool",            description: "Énergique, motivant. Comme un ami qui sait tout.",              voiceId: "Puck",     icon: "🎧" },
  { id: "victoria",   name: "Mlle. Victoria",title: "La mentore brillante",           description: "Élégante, inspirante. Elle valide ton intelligence.",          voiceId: "Aoede",    icon: "✨" },
  { id: "marckenson", name: "M. Marckenson", title: "Le coach intense",               description: "Direct, motivant. Il te pousse à donner ton maximum.",         voiceId: "Charon",   icon: "🎯" },
  { id: "camille",    name: "Mlle. Camille", title: "La grande sœur bienveillante",   description: "Douce, patiente. Un espace safe pour apprendre.",              voiceId: "Leda",     icon: "💝" },
];

export const PERSONALITY_IDS = PERSONALITIES.map((p) => p.id);
export const PERSONAS = PERSONALITIES; // alias

// ===== LANGUAGES =====
export const LANGUAGE_OPTIONS = [
  { id: "fr",  name: "Français", description: "Réponses en français uniquement", icon: "🇫🇷" },
  { id: "kr",  name: "Kreyòl",   description: "Repons yo nan kreyòl sèlman",     icon: "🇭🇹" },
  { id: "mix", name: "Mixte",    description: "Français + kreyòl naturellement", icon: "🌍" },
];

export const LANGUAGES = LANGUAGE_OPTIONS; // alias

// ===== STORAGE KEYS =====
export const STORAGE_KEYS = {
  ONBOARDING:             "laureat.onboardingComplete",
  PREFERENCES:            "laureat.preferences",
  TRACK:                  "laureat.track",
  THEME:                  "laureat.theme",
  USAGE:                  "laureat.usage",
  PLAN:                   "laureat.plan",
  SCAN_HISTORY:           "laureat.scanHistory",
  CLASSROOM_SESSIONS:     "laureat.classroom.sessions",
  LAST_SESSION_SUMMARY:   "laureat.lastSessionSummary",
  TUTORIAL_SEEN:          "laureat.tutorialSeen",
  ADMIN_OVERRIDE:         "laureat.admin",
  VIEW_AS_PLAN:           "laureat.viewAsPlan",
  LESSON_CACHE:           "laureat.lessonCache.v1",
  QUIZ_CACHE_PREFIX:      "laureat.quizCache.",
};

// ===== BOARDS =====
export const BOARD_TYPES = ["enonce", "solution", "visuel"];

export const BOARD_TYPE = {
  ENONCE:   "enonce",
  SOLUTION: "solution",
  VISUEL:   "visuel",
};

// ===== HIGHLIGHTS =====
export const HIGHLIGHT_COLORS = {
  yellow: "#fde047",
  pink:   "#f9a8d4",
  green:  "#86efac",
  red:    "#fca5a5",
  blue:   "#93c5fd",
};

// ===== MESSAGE TYPES =====
export const MESSAGE_TYPES = {
  TUTOR:       "tutor",
  USER:        "user",
  SYSTEM:      "system",
  ACKNOWLEDGE: "acknowledge",
  EXPLAIN:     "explain",
  QUESTION:    "question",
  PRAISE:      "praise",
  THINKING:    "thinking",
};

// Per-segment display info (label + icon). This is what MessageBubble looks up.
// Keyed by the lowercase segment.type the chat API returns.
export const MESSAGE_TYPE_INFO = {
  thinking:    { label: "Réflexion",   icon: "🤔" },
  acknowledge: { label: "Accueil",     icon: "💬" },
  explain:     { label: "Explication", icon: "📘" },
  question:    { label: "Question",    icon: "❓" },
  praise:      { label: "Bravo",       icon: "🌟" },
};

// ===== MODELS =====
export const MODELS = {
  CHAT_PRIMARY:   "google/gemini-3-pro-preview",
  CHAT_FALLBACK:  "anthropic/claude-opus-4.7",
  SOLVE_PRIMARY:  "openai/gpt-5.5",
  BOARD_PRIMARY:  "anthropic/claude-opus-4.7",
  OCR_PRIMARY:    "google/gemini-3.5-flash-lite",
};

// ===== APP META =====
export const APP_NAME = "Laureat AI";
export const APP_URL  = "https://examapp-virid.vercel.app";
export const SUPPORT_PHONE = ""; // fill once you set up WhatsApp support
