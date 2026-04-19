// src/data/pastExams.js
// MENFP past exams organized BY YEAR. This powers the new Archives tab.
// Structure: each year has subject papers + known trap questions.

export const EXAM_YEARS = [
  {
    year: 2024,
    label: "Récent",
    session: "Juillet 2024",
    description: "Dernière session officielle",
    complete: true,
    papers: [
      { subject: "Mathématiques",     available: true,  pages: 4, duration: "3h" },
      { subject: "Physique",          available: true,  pages: 3, duration: "2h" },
      { subject: "Chimie",            available: true,  pages: 3, duration: "2h" },
      { subject: "Histoire d'Haïti",  available: true,  pages: 2, duration: "2h" },
      { subject: "Français",          available: true,  pages: 3, duration: "3h" },
      { subject: "Créole",            available: false, pages: 0, duration: "2h" },
    ],
    traps: [
      {
        subject: "Physique",
        question: "Question 4 : Conversion d'unités cm → m cachée dans l'énoncé",
        tip: "72% des élèves oublient de convertir les 5 cm en 0,05 m",
      },
      {
        subject: "Histoire d'Haïti",
        question: "Question 7 : Date de proclamation vs date de rédaction",
        tip: "La proclamation est le 1er janvier 1804, pas le 29 novembre 1803",
      },
    ],
  },
  {
    year: 2023,
    session: "Juillet 2023",
    description: "Session classique — niveau standard",
    complete: true,
    papers: [
      { subject: "Mathématiques",     available: true, pages: 4, duration: "3h" },
      { subject: "Physique",          available: true, pages: 3, duration: "2h" },
      { subject: "Chimie",            available: true, pages: 3, duration: "2h" },
      { subject: "Histoire d'Haïti",  available: true, pages: 2, duration: "2h" },
      { subject: "Français",          available: true, pages: 3, duration: "3h" },
      { subject: "Géographie",        available: true, pages: 2, duration: "2h" },
    ],
    traps: [
      {
        subject: "Mathématiques",
        question: "Question 3 : Équation du second degré avec Δ = 0",
        tip: "Beaucoup cherchent 2 solutions alors qu'il n'y en a qu'une (solution double)",
      },
    ],
  },
  {
    year: 2022,
    session: "Juillet 2022",
    description: "Session post-COVID — adaptée",
    complete: true,
    papers: [
      { subject: "Mathématiques",    available: true, pages: 3, duration: "3h" },
      { subject: "Physique",         available: true, pages: 3, duration: "2h" },
      { subject: "Chimie",           available: true, pages: 2, duration: "2h" },
      { subject: "Histoire d'Haïti", available: true, pages: 2, duration: "2h" },
      { subject: "Français",         available: true, pages: 3, duration: "3h" },
    ],
    traps: [
      {
        subject: "Histoire d'Haïti",
        question: "Question 5 : Durée exacte de l'occupation américaine",
        tip: "19 ans (1915-1934), pas 15 ni 20. Piège classique.",
      },
      {
        subject: "Physique",
        question: "Question 2 : Unité du Newton mal formulée",
        tip: "Newton = kg·m/s², pas kg·m²/s",
      },
    ],
  },
  {
    year: 2021,
    session: "Septembre 2021",
    description: "Session reportée",
    complete: true,
    papers: [
      { subject: "Mathématiques",    available: true,  pages: 3, duration: "3h" },
      { subject: "Physique",         available: true,  pages: 3, duration: "2h" },
      { subject: "Histoire d'Haïti", available: true,  pages: 2, duration: "2h" },
      { subject: "Français",         available: false, pages: 0, duration: "3h" },
    ],
    traps: [],
  },
  {
    year: 2020,
    session: "Août 2020",
    description: "Session COVID",
    complete: false,
    papers: [
      { subject: "Mathématiques",    available: true, pages: 3, duration: "3h" },
      { subject: "Physique",         available: true, pages: 2, duration: "2h" },
    ],
    traps: [],
  },
];
