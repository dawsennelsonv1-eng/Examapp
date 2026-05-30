// src/utils/coursData.js v20
// Structured curriculum data for the Cours feature.
// Hierarchy: Subjects → Chapters → Events/Points
// This is the FOUNDATION — admin (you) will expand each subject over time.

export const SUBJECTS = [
  {
    id: "math",
    name: "Mathématiques",
    icon: "📐",
    color: "from-violet-500 to-indigo-600",
    banner: "linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)",
    tracks: ["9AF", "NS4"],
  },
  {
    id: "physique",
    name: "Physique",
    icon: "⚛️",
    color: "from-blue-500 to-cyan-600",
    banner: "linear-gradient(135deg, #2563eb 0%, #0891b2 100%)",
    tracks: ["NS4"],
  },
  {
    id: "chimie",
    name: "Chimie",
    icon: "🧪",
    color: "from-emerald-500 to-teal-600",
    banner: "linear-gradient(135deg, #10b981 0%, #0d9488 100%)",
    tracks: ["NS4"],
  },
  {
    id: "biologie",
    name: "Biologie",
    icon: "🧬",
    color: "from-green-500 to-emerald-600",
    banner: "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
    tracks: ["NS4"],
  },
  {
    id: "francais",
    name: "Français",
    icon: "📚",
    color: "from-rose-500 to-pink-600",
    banner: "linear-gradient(135deg, #f43f5e 0%, #db2777 100%)",
    tracks: ["9AF", "NS4"],
  },
  {
    id: "sciences_sociales",
    name: "Sciences Sociales",
    icon: "🌍",
    color: "from-amber-500 to-orange-600",
    banner: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
    tracks: ["9AF", "NS4"],
  },
  {
    id: "kreyol",
    name: "Kreyòl",
    icon: "🇭🇹",
    color: "from-red-500 to-rose-600",
    banner: "linear-gradient(135deg, #ef4444 0%, #e11d48 100%)",
    tracks: ["9AF", "NS4"],
  },
];

// Sample chapters — admin will expand these.
// Structure: subjectId → list of chapters → each has events/points.
export const CHAPTERS = {
  physique: [
    {
      id: "phys_ch1",
      title: "Cinématique",
      subtitle: "Mouvement, vitesse, accélération",
      duration: "2 semaines",
      events: [
        { id: "phys_ch1_p1", title: "Définition du mouvement", type: "point", summary: "Référentiel, trajectoire, repère." },
        { id: "phys_ch1_p2", title: "Vitesse moyenne et instantanée", type: "point", summary: "Formules et différences." },
        { id: "phys_ch1_p3", title: "Mouvement rectiligne uniforme", type: "point", summary: "MRU: v constante, x = v·t." },
        { id: "phys_ch1_p4", title: "Mouvement rectiligne uniformément varié", type: "point", summary: "MRUV: a constante, équations horaires." },
        { id: "phys_ch1_q", title: "Quiz Cinématique", type: "quiz", summary: "Teste tes connaissances" },
      ],
    },
    {
      id: "phys_ch2",
      title: "Dynamique",
      subtitle: "Forces et lois de Newton",
      duration: "3 semaines",
      events: [
        { id: "phys_ch2_p1", title: "Notion de force", type: "point", summary: "Vecteur force, intensité, direction." },
        { id: "phys_ch2_p2", title: "Les 3 lois de Newton", type: "point", summary: "Inertie, principe fondamental, action-réaction." },
        { id: "phys_ch2_p3", title: "Poids et masse", type: "point", summary: "P = m·g, distinction." },
        { id: "phys_ch2_q", title: "Quiz Dynamique", type: "quiz", summary: "Teste tes connaissances" },
      ],
    },
    {
      id: "phys_ch3",
      title: "Énergie et travail",
      subtitle: "Énergie cinétique, potentielle, conservation",
      duration: "2 semaines",
      events: [
        { id: "phys_ch3_p1", title: "Travail d'une force", type: "point", summary: "W = F·d·cos(α)" },
        { id: "phys_ch3_p2", title: "Énergie cinétique", type: "point", summary: "Ec = ½·m·v²" },
        { id: "phys_ch3_p3", title: "Énergie potentielle", type: "point", summary: "Ep = m·g·h" },
        { id: "phys_ch3_p4", title: "Conservation de l'énergie", type: "point", summary: "Em = Ec + Ep = constante" },
        { id: "phys_ch3_q", title: "Quiz Énergie", type: "quiz", summary: "Teste tes connaissances" },
      ],
    },
  ],
  math: [
    {
      id: "math_ch1",
      title: "Fonctions",
      subtitle: "Domaine, image, représentation",
      duration: "3 semaines",
      events: [
        { id: "math_ch1_p1", title: "Définition d'une fonction", type: "point", summary: "Application f: x → y" },
        { id: "math_ch1_p2", title: "Domaine de définition", type: "point", summary: "Trouver Df" },
        { id: "math_ch1_p3", title: "Fonctions affines et linéaires", type: "point", summary: "y = ax + b" },
        { id: "math_ch1_q", title: "Quiz Fonctions", type: "quiz", summary: "Teste tes connaissances" },
      ],
    },
    {
      id: "math_ch2",
      title: "Trigonométrie",
      subtitle: "Sin, cos, tan et identités",
      duration: "2 semaines",
      events: [
        { id: "math_ch2_p1", title: "Cercle trigonométrique", type: "point", summary: "Angles et coordonnées" },
        { id: "math_ch2_p2", title: "Fonctions sin, cos, tan", type: "point", summary: "Définitions et valeurs remarquables" },
        { id: "math_ch2_p3", title: "Identités fondamentales", type: "point", summary: "sin² + cos² = 1, etc." },
        { id: "math_ch2_q", title: "Quiz Trigo", type: "quiz", summary: "Teste tes connaissances" },
      ],
    },
  ],
  chimie: [
    {
      id: "chim_ch1",
      title: "L'atome",
      subtitle: "Structure et configuration",
      duration: "2 semaines",
      events: [
        { id: "chim_ch1_p1", title: "Constituants de l'atome", type: "point", summary: "Protons, neutrons, électrons" },
        { id: "chim_ch1_p2", title: "Tableau périodique", type: "point", summary: "Groupes et périodes" },
        { id: "chim_ch1_q", title: "Quiz Atome", type: "quiz", summary: "Teste tes connaissances" },
      ],
    },
  ],
};

// Lookup helpers
export function getSubject(id) {
  return SUBJECTS.find((s) => s.id === id);
}
export function getChapters(subjectId) {
  return CHAPTERS[subjectId] || [];
}
export function getChapter(subjectId, chapterId) {
  return getChapters(subjectId).find((c) => c.id === chapterId);
}
export function getEvent(subjectId, chapterId, eventId) {
  return getChapter(subjectId, chapterId)?.events.find((e) => e.id === eventId);
}
