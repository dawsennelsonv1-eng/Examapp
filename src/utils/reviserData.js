// src/utils/reviserData.js v20
// Past exams (sorted by year) + weekly admin-curated quizzes.
// Premium gate: last 5 years are paid-only.

const CURRENT_YEAR = new Date().getFullYear(); // 2026

export const PAST_EXAMS = [
  // 2026 (this year — locked for free users)
  { year: 2026, track: "9AF", subjects: ["mathematiques", "francais", "sciences_sociales", "creole"], premium: true },
  { year: 2026, track: "NS4", subjects: ["mathematiques", "physique", "chimie", "biologie", "francais", "philosophie"], premium: true },

  // 2025-2022 (last 5 years — premium-only)
  { year: 2025, track: "9AF", subjects: ["mathematiques", "francais", "sciences_sociales", "creole"], premium: true },
  { year: 2025, track: "NS4", subjects: ["mathematiques", "physique", "chimie", "biologie", "francais"], premium: true },
  { year: 2024, track: "9AF", subjects: ["mathematiques", "francais", "sciences_sociales"], premium: true },
  { year: 2024, track: "NS4", subjects: ["mathematiques", "physique", "chimie", "biologie"], premium: true },
  { year: 2023, track: "9AF", subjects: ["mathematiques", "francais"], premium: true },
  { year: 2023, track: "NS4", subjects: ["mathematiques", "physique", "chimie"], premium: true },
  { year: 2022, track: "9AF", subjects: ["mathematiques", "francais"], premium: true },
  { year: 2022, track: "NS4", subjects: ["mathematiques", "physique"], premium: true },

  // 2021 and older — free access
  { year: 2021, track: "9AF", subjects: ["mathematiques", "francais"], premium: false },
  { year: 2021, track: "NS4", subjects: ["mathematiques", "physique"], premium: false },
  { year: 2020, track: "NS4", subjects: ["mathematiques", "physique"], premium: false },
  { year: 2019, track: "NS4", subjects: ["mathematiques", "physique"], premium: false },
  { year: 2018, track: "NS4", subjects: ["mathematiques", "physique"], premium: false },
];

export function isExamLocked(exam, planTier) {
  if (!exam.premium) return false;
  return planTier !== "premium" && planTier !== "basic";
}

// Quiz format types
export const QUIZ_FORMATS = [
  { id: "multiple_choice", label: "QCM", icon: "✅", color: "from-violet-500 to-indigo-600" },
  { id: "flashcards",      label: "Flashcards", icon: "📚", color: "from-amber-500 to-orange-600" },
  { id: "schema",          label: "Schémas", icon: "📐", color: "from-blue-500 to-cyan-600" },
  { id: "fill_blank",      label: "À compléter", icon: "✏️", color: "from-emerald-500 to-teal-600" },
  { id: "matching",        label: "Associations", icon: "🔗", color: "from-rose-500 to-pink-600" },
];

// Weekly quizzes — admin populates these. Demo placeholders for now.
export const WEEKLY_QUIZZES = [
  {
    id: "wq_phys_jun1",
    title: "Cinématique — Quiz hebdomadaire",
    subject: "physique",
    format: "multiple_choice",
    questionCount: 10,
    duration: "15 min",
    week: "Semaine du 26 mai",
    referencedExam: { year: 2024, exercise: "Exercice 2", track: "NS4" },
  },
  {
    id: "wq_math_jun1",
    title: "Trigonométrie — Quiz hebdomadaire",
    subject: "math",
    format: "flashcards",
    questionCount: 20,
    duration: "10 min",
    week: "Semaine du 26 mai",
    referencedExam: { year: 2023, exercise: "Exercice 3", track: "NS4" },
  },
];

export function getExamsByYear() {
  const byYear = {};
  for (const exam of PAST_EXAMS) {
    if (!byYear[exam.year]) byYear[exam.year] = [];
    byYear[exam.year].push(exam);
  }
  // Sorted descending (most recent first)
  return Object.entries(byYear)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, exams]) => ({ year: Number(year), exams }));
}
