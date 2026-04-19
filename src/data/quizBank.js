// src/data/quizBank.js
// Sample MCQ bank. Replace with real MENFP content when available.
// Each question is tagged with subject + year + difficulty so we can filter.

export const QUIZ_BANK = {
  physique: [
    {
      id: "phy_001",
      subject: "Physique",
      year: 2023,
      difficulty: "moyen",
      question: "Un corps de 5 kg tombe d'une hauteur de 10 m (g = 10 m/s²). Quelle est sa vitesse à l'arrivée au sol ?",
      options: ["10 m/s", "14,1 m/s", "20 m/s", "50 m/s"],
      correct: 1,
      explanation: "On utilise v = √(2gh) = √(2×10×10) = √200 ≈ 14,1 m/s. L'énergie potentielle se convertit entièrement en énergie cinétique.",
      askedIn: { year: 2023, session: "Juillet" },
    },
    {
      id: "phy_002",
      subject: "Physique",
      year: 2022,
      difficulty: "facile",
      question: "Quelle est l'unité de la force dans le Système International ?",
      options: ["Watt", "Newton", "Joule", "Pascal"],
      correct: 1,
      explanation: "Le Newton (N) est l'unité de force. 1 N = 1 kg·m/s². Watt = puissance, Joule = énergie, Pascal = pression.",
      askedIn: { year: 2022, session: "Juillet" },
    },
    {
      id: "phy_003",
      subject: "Physique",
      year: 2024,
      difficulty: "difficile",
      question: "Un ressort de constante k = 200 N/m est comprimé de 5 cm. Quelle énergie est stockée ?",
      options: ["0,25 J", "0,5 J", "1 J", "2,5 J"],
      correct: 0,
      explanation: "E = ½·k·x² = ½ × 200 × (0,05)² = 100 × 0,0025 = 0,25 J. Attention : convertir 5 cm en 0,05 m !",
      askedIn: { year: 2024, session: "Juillet" },
    },
  ],
  math: [
    {
      id: "math_001",
      subject: "Mathématiques",
      year: 2023,
      difficulty: "moyen",
      question: "Résoudre : 2x + 5 = 3x - 7",
      options: ["x = 2", "x = 12", "x = -12", "x = -2"],
      correct: 1,
      explanation: "2x + 5 = 3x - 7 → 5 + 7 = 3x - 2x → 12 = x. Donc x = 12.",
      askedIn: { year: 2023, session: "Juillet" },
    },
    {
      id: "math_002",
      subject: "Mathématiques",
      year: 2022,
      difficulty: "moyen",
      question: "Quel est le discriminant de l'équation x² - 5x + 6 = 0 ?",
      options: ["1", "-1", "49", "25"],
      correct: 0,
      explanation: "Δ = b² - 4ac = (-5)² - 4(1)(6) = 25 - 24 = 1. Donc deux solutions réelles distinctes.",
      askedIn: { year: 2022, session: "Juillet" },
    },
  ],
  histoire: [
    {
      id: "his_001",
      subject: "Histoire d'Haïti",
      year: 2023,
      difficulty: "facile",
      question: "En quelle année Haïti a-t-elle obtenu son indépendance ?",
      options: ["1791", "1803", "1804", "1806"],
      correct: 2,
      explanation: "L'indépendance d'Haïti a été proclamée le 1er janvier 1804 par Jean-Jacques Dessalines aux Gonaïves.",
      askedIn: { year: 2023, session: "Juillet" },
    },
    {
      id: "his_002",
      subject: "Histoire d'Haïti",
      year: 2024,
      difficulty: "moyen",
      question: "Qui a proclamé l'indépendance d'Haïti ?",
      options: ["Toussaint Louverture", "Jean-Jacques Dessalines", "Henri Christophe", "Alexandre Pétion"],
      correct: 1,
      explanation: "Dessalines a proclamé l'indépendance aux Gonaïves le 1er janvier 1804. Toussaint était mort en France en 1803.",
      askedIn: { year: 2024, session: "Juillet" },
    },
    {
      id: "his_003",
      subject: "Histoire d'Haïti",
      year: 2022,
      difficulty: "difficile",
      question: "Combien de temps a duré l'occupation américaine d'Haïti ?",
      options: ["15 ans", "19 ans", "25 ans", "10 ans"],
      correct: 1,
      explanation: "L'occupation américaine a duré 19 ans, de 1915 à 1934. Attention à ne pas confondre avec d'autres occupations dans les Caraïbes.",
      askedIn: { year: 2022, session: "Juillet" },
    },
  ],
  chimie: [
    {
      id: "chi_001",
      subject: "Chimie",
      year: 2023,
      difficulty: "facile",
      question: "Quel est le symbole chimique de l'or ?",
      options: ["Or", "Au", "Ag", "Go"],
      correct: 1,
      explanation: "Au vient du latin 'aurum'. Ag = argent (argentum). Astuce : les symboles viennent souvent du nom latin.",
      askedIn: { year: 2023, session: "Juillet" },
    },
  ],
};

export const QUIZ_SUBJECTS = [
  { id: "physique", name: "Physique",         emoji: "⚛️" },
  { id: "math",     name: "Mathématiques",    emoji: "🔢" },
  { id: "histoire", name: "Histoire d'Haïti", emoji: "🏛️" },
  { id: "chimie",   name: "Chimie",           emoji: "🧪" },
];

export function getQuizzesForSubject(subjectId) {
  return QUIZ_BANK[subjectId] || [];
}

export function getAllQuizzes() {
  return Object.values(QUIZ_BANK).flat();
}
