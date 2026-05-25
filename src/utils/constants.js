// src/utils/constants.js
// Wave 1: 5 personas, board types, highlight colors.

export const EXAM_DATE = new Date("2026-07-17T08:00:00");

export const TRACKS = {
  NINE_AF: "9AF",
  NS4: "NS4",
};

export const SUBJECTS_BY_TRACK = {
  "9AF": ["Mathématiques", "Physique", "Chimie", "Sciences Sociales", "Français", "Créole"],
  "NS4": ["Mathématiques", "Physique", "Chimie", "Biologie", "Sciences Sociales", "Philosophie", "Français"],
};

export const WEBHOOKS = {
  OCR_SCAN: "/api/solve",
  SOLVE: "/api/solve",
  TUTOR_CHAT: "/api/chat",
  EXPLAIN_STEP: "/api/chat",
  GENERATE_BOARD: "/api/board",
  GENERATE_QUIZ: "/api/generate-quizzes",
  TTS: "/api/tts",
  TRANSCRIBE: "/api/transcribe",
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
  DEV_MODE: "laureat.devMode",
};

export const USAGE_CAPS = {
  free: { scans: 3, chats: 10, boards: 1, quizzes: 5 },
  basic: { scans: 15, chats: 50, boards: 5, quizzes: 20 },
  premium: { scans: -1, chats: -1, boards: -1, quizzes: -1 },
};

export const PLAN_PRICES = { basic: 900, premium: 2400 };

export const PERSONALITIES = [
  {
    id: "joseph",
    name: "M. Joseph",
    title: "Le vétéran patient",
    description: "Méthode classique, calme, structuré",
    age: "62",
    style: "fr-male-mature",
    color: "from-amber-600 to-orange-700",
    avatarBg: "bg-gradient-to-br from-amber-200 to-orange-300",
    icon: "👨‍🏫",
  },
  {
    id: "tikens",
    name: "Ti-Kens",
    title: "Le grand frère cool",
    description: "Énergie, hacks, style moderne",
    age: "21",
    style: "fr-male-young",
    color: "from-cyan-500 to-blue-700",
    avatarBg: "bg-gradient-to-br from-cyan-200 to-blue-300",
    icon: "🧑‍🎤",
  },
  {
    id: "victoria",
    name: "Mlle. Victoria",
    title: "La mentor brillante",
    description: "Inspirante, élégante, exigeante",
    age: "28",
    style: "fr-female-elegant",
    color: "from-rose-500 to-red-700",
    avatarBg: "bg-gradient-to-br from-rose-200 to-red-300",
    icon: "👩‍💼",
  },
  {
    id: "marckenson",
    name: "M. Marckenson",
    title: "Le coach intense",
    description: "Pousse fort, pas d'excuses, respectueux",
    age: "32",
    style: "fr-male-coach",
    color: "from-slate-700 to-slate-900",
    avatarBg: "bg-gradient-to-br from-slate-300 to-slate-500",
    icon: "💪",
  },
  {
    id: "camille",
    name: "Mlle. Camille",
    title: "La grande sœur",
    description: "Bienveillante, organisée, rassurante",
    age: "25",
    style: "fr-female-warm",
    color: "from-violet-500 to-purple-700",
    avatarBg: "bg-gradient-to-br from-violet-200 to-purple-300",
    icon: "👩‍🏫",
  },
];

export const LANGUAGE_OPTIONS = [
  { id: "mix", name: "Mélange français-créole", description: "Recommandé", badge: "Recommandé", icon: "🇭🇹" },
  { id: "fr", name: "Français", description: "Uniquement français", icon: "🇫🇷" },
  { id: "kr", name: "Kreyòl", description: "Sèlman kreyòl", icon: "🗣️" },
];

export const BOARD_TYPES = {
  enonce: { name: "Énoncé", icon: "📋", description: "Données et question" },
  solution: { name: "Solution", icon: "✏️", description: "Travail étape par étape" },
  visuel: { name: "Visuel", icon: "📐", description: "Diagrammes et schémas" },
  tangent: { name: "Annexe", icon: "📝", description: "Discussion annexe" },
};

export const HIGHLIGHT_COLORS = {
  yellow: { bg: "bg-yellow-300/40", text: "text-yellow-100", label: "Important" },
  pink: { bg: "bg-pink-400/40", text: "text-pink-100", label: "Formule" },
  green: { bg: "bg-emerald-400/40", text: "text-emerald-100", label: "Résultat" },
  red: { bg: "bg-red-400/40", text: "text-red-100", label: "Attention" },
  blue: { bg: "bg-blue-400/40", text: "text-blue-100", label: "Conversion" },
};

export const MESSAGE_TYPES = {
  thinking: { icon: "🤔", color: "text-slate-400", label: "Réflexion" },
  acknowledge: { icon: "💬", color: "text-violet-400", label: "Réponse" },
  explain: { icon: "✏️", color: "text-cyan-400", label: "Explication" },
  question: { icon: "❓", color: "text-amber-400", label: "Question" },
  praise: { icon: "✨", color: "text-emerald-400", label: "Bravo" },
};
