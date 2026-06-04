// src/utils/trackConfig.js — v24
// SINGLE SOURCE OF TRUTH for everything that differs between tracks (9AF vs NS4).
// Exam dates, subject lists, accent colors, vocabulary level, and tutor tone all
// live here so they can never disagree across pages. constants.js re-exports the
// dates from here; coursData filtering, Home, Cours, and the AI prompts read from
// here too.

export const TRACK_CONFIG = {
  "9AF": {
    id: "9AF",
    label: "9ème AF",
    fullLabel: "9ème Année Fondamentale",
    examLabel: "Examen 9ème AF",
    examStart: new Date("2026-06-29T08:00:00"),
    examEnd: new Date("2026-07-02T17:00:00"),
    examRange: "29 juin – 2 juillet",
    // visual identity
    accent: "amber",
    accentClass: "from-amber-500 to-orange-600",
    accentText: "text-amber-500",
    accentRing: "ring-amber-400/30",
    mascotStyle: "friendly",
    touchTargetSize: "lg",
    // content/AI behavior
    vocabularyLevel: "simple",     // simpler French, more Kreyòl-friendly
    tone: "encourageant et patient, comme un grand frère",
    exampleStyle: "exemples concrets de la vie quotidienne (marché, transport, lekòl)",
    subjectIds: ["math", "francais", "sciences_sociales", "kreyol"],
  },
  NS4: {
    id: "NS4",
    label: "NS4",
    fullLabel: "Nouveau Secondaire 4",
    examLabel: "Examen NS4 / Bac",
    examStart: new Date("2026-07-03T08:00:00"),
    examEnd: new Date("2026-07-07T17:00:00"),
    examRange: "3 – 7 juillet",
    accent: "violet",
    accentClass: "from-violet-500 to-indigo-700",
    accentText: "text-violet-400",
    accentRing: "ring-violet-400/30",
    mascotStyle: "serious",
    touchTargetSize: "md",
    vocabularyLevel: "formal",     // formal academic French
    tone: "direct et stimulant intellectuellement, comme un mentor exigeant",
    exampleStyle: "exemples abstraits et scientifiques",
    subjectIds: ["math", "physique", "chimie", "biologie", "francais", "sciences_sociales", "philosophie", "kreyol"],
  },
};

export const DEFAULT_TRACK = "NS4";

export function getTrackConfig(track) {
  return TRACK_CONFIG[track] || TRACK_CONFIG[DEFAULT_TRACK];
}

// Returns { track, days, label, range, start, end } for a countdown.
export function getExamCountdown(track, now = new Date()) {
  const cfg = getTrackConfig(track);
  const ms = cfg.examStart.getTime() - now.getTime();
  const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  return {
    track: cfg.id,
    days,
    label: cfg.examLabel,
    range: cfg.examRange,
    start: cfg.examStart,
    end: cfg.examEnd,
  };
}

// Does a subject (with subject.tracks array) belong to this track?
export function subjectInTrack(subject, track) {
  if (!subject) return false;
  if (Array.isArray(subject.tracks)) return subject.tracks.includes(track);
  return true;
}

// The compact text block injected into AI prompts so the tutor adapts to the track.
export function trackPromptHint(track) {
  const cfg = getTrackConfig(track);
  return `Niveau: ${cfg.fullLabel}. Langage: ${cfg.vocabularyLevel === "simple"
    ? "français simple, accessible, tu peux glisser du créole si ça aide"
    : "français académique formel"}. Ton: ${cfg.tone}. Style d'exemples: ${cfg.exampleStyle}.`;
}
