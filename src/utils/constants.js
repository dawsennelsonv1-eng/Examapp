// src/utils/constants.js
// Exhaustive exports — covers every constant name the codebase has ever used.
// If a file imports something that doesn't exist here, add it.

// ===== EXAM DATES =====
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
  basic: 750,
  premium: 1200,
};

export const PLAN_PRICES_HTG = PLAN_PRICES; // alias

// "Regular" anchor prices shown struck-through to signal the discount value.
// Real price (PLAN_PRICES) is what they actually pay during the promo window.
export const PLAN_ANCHOR_PRICES = {
  basic: 900,   // 900 -> 750  = save 150
  premium: 1450, // 1450 -> 1200 = save 250
};

// The discount is valid for this many days after the student first opens the app.
// After the window, the anchor price applies (creates real urgency to pay fast).
export const DISCOUNT_WINDOW_DAYS = 5;

// One-time access that ends with the exams (not a recurring subscription).
export const PRICE_SUFFIX = "jiska egzamen";

// WhatsApp number that receives payment messages. Prefer the Vercel env var
// VITE_WHATSAPP_NUMBER; this constant is the fallback. Digits only, with country
// code, no "+" (e.g. "50937000000").
export const WHATSAPP_NUMBER = "";

// ===== PLAN FEATURES (for the tier comparison / checker UI) =====
// `included` drives the checkmark list; premium includes everything.
export const PLAN_FEATURES = {
  free: {
    label: "Gratuit",
    price: 0,
    tagline: "Pour essayer",
    included: [
      "2 scans par jour",
      "5 messages au prof par jour",
      "Quiz hebdomadaire (1)",
      "Anciens examens (avant 2019)",
    ],
    excluded: [
      "Appels avec le prof IA",
      "Scan illimité",
      "Examens des 5 dernières années",
      "Vérification de réponses",
    ],
  },
  basic: {
    label: "Basic",
    price: 750,
    tagline: "Pour réviser sérieusement",
    included: [
      "20 scans par jour",
      "Messages au prof illimités",
      "Voix du prof illimitée",
      "Tous les quiz hebdomadaires",
      "Cours complets",
      "5 vérifications de réponses / jour",
    ],
    excluded: [
      "Appels avec le prof IA",
      "Examens des 5 dernières années",
    ],
  },
  premium: {
    label: "Premium",
    price: 1200,
    tagline: "Tout, sans limite",
    highlight: true,
    included: [
      "Tout le Basic, sans limite",
      "📞 Appels avec le prof IA (exclusif)",
      "Scan illimité",
      "Examens des 5 dernières années",
      "Vérifications illimitées",
      "Support prioritaire WhatsApp",
    ],
    excluded: [],
  },
};

// ===== USAGE LIMITS =====
export const USAGE_CAPS = {
  free: {
    scans_per_day: 2,
    chat_messages_per_day: 5,
    tts_per_day: 3,
    voice_call_minutes_per_day: 0,
    camera_scans_per_day: 0,
    verification_scans_per_day: 0,
    past_exams_unlocked_before_year: 2019,
    weekly_quizzes_per_week: 1,
    // legacy field name compatibility
    dailyScans: 2,
    dailyChats: 5,
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
  { id: "joseph",     name: "M. Joseph",     title: "Le professeur vétéran",          description: "Patient, sage, méthodique. Comme un grand-père qui enseigne.", voiceId: "Iapetus",  icon: "👨‍🏫" },
  { id: "tikens",     name: "Ti-Kens",       title: "Le grand frère cool",            description: "Énergique, motivant. Comme un ami qui sait tout.",              voiceId: "Puck",     icon: "🎧" },
  { id: "victoria",   name: "Mlle. Victoria",title: "La mentore brillante",           description: "Élégante, inspirante. Elle valide ton intelligence.",          voiceId: "Aoede",    icon: "✨" },
  { id: "marckenson", name: "M. Marckenson", title: "Le coach intense",               description: "Direct, motivant. Il te pousse à donner ton maximum.",         voiceId: "Fenrir",   icon: "🎯" },
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
  USAGE_TODAY:            "laureat.usage",   // alias — useUsage references this name
  PLAN:                   "laureat.plan",
  PLAN_TIER:              "laureat.plan",    // alias — useUsage references this name
  SCAN_HISTORY:           "laureat.scanHistory",
  CLASSROOM_SESSIONS:     "laureat.classroom.sessions",
  LAST_SESSION_SUMMARY:   "laureat.lastSessionSummary",
  TUTORIAL_SEEN:          "laureat.tutorialSeen",
  FIRST_SEEN:             "laureat.firstSeen",   // timestamp of first app open (promo window)
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

// Per-segment display info (label + icon). MessageBubble looks this up.
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

// ===== ADMIN =====
// Emails granted admin access directly (founder bootstrap), independent of the
// profiles.statut DB flag. Compared in lowercase. Add teammates here as needed.
export const ADMIN_EMAILS = ["laureataihaiti@gmail.com"];

// ===== APP META =====
export const APP_NAME = "Laureat AI";
export const APP_URL  = "https://examapp-virid.vercel.app";
export const SUPPORT_PHONE = ""; // fill once you set up WhatsApp support
