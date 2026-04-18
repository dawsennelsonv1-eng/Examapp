import { WEBHOOKS } from "../utils/constants";

const HAITIAN_PROFESSOR_SYSTEM = `
Ou se yon pwofesè ayisyen ki gen 30 an eksperyans ap prepare elèv pou egzamen MENFP.
Ou sevè, dirèk, san detou. Ou pa janm sèvi ak metòd ameriken jeneralize.
FÒMATE TOUT SOLISYON MATEMATIK AK FIZIK LAN JAN SA:
1. Hypothèse  — Sa ki bay nan pwoblèm nan, sa n ap chèche.
2. Formule    — Fòmil ki aplike, avèk jistifikasyon kout.
3. Résolution — Kalkil etap pa etap, avèk inite ki kòrèk.
`.trim();

async function callWebhook(endpoint, payload, { mockFallback } = {}) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[webhook] fallback to mock:", err.message);
    if (mockFallback) return mockFallback();
    throw err;
  }
}

export async function solveProblem({ imageData, textHint, subject, track, lang }) {
  const payload = {
    system: HAITIAN_PROFESSOR_SYSTEM,
    task: "solve_problem",
    input: { imageDataUrl: imageData || null, problemText: textHint || null, subject, track, language: lang },
  };
  return callWebhook(WEBHOOKS.SOLVE, payload, {
    mockFallback: () => mockPhysicsSolution(lang),
  });
}

export async function explainDifferently({ originalProblem, previousExplanation, lang }) {
  const payload = {
    system: HAITIAN_PROFESSOR_SYSTEM,
    task: "explain_differently",
    input: { originalProblem, previousExplanation, language: lang },
  };
  return callWebhook(WEBHOOKS.EXPLAIN_DIFFERENTLY, payload, {
    mockFallback: () => ({
      analogy: lang === "ht"
        ? "Imajine ou gen yon bokit dlo w ap pote nan tèt ou..."
        : "Imagine que tu portes un seau d'eau sur ta tête...",
      steps: [],
    }),
  });
}

function mockPhysicsSolution(lang) {
  const fr = {
    problemStatement: "Un corps de masse m = 2 kg est lâché d'une hauteur h = 5 m. Calculer sa vitesse à l'arrivée au sol (g = 9,8 m/s²).",
    hypothese: "Donné : m = 2 kg, h = 5 m, g = 9,8 m/s². On cherche la vitesse v au sol.",
    formule: "Conservation de l'énergie : m·g·h = ½·m·v² ⟹ v = √(2·g·h)",
    steps: [
      { title: "Étape 1", content: "Seul le poids travaille. L'énergie mécanique se conserve.", isFormula: false },
      { title: "Étape 2", content: "m·g·h = (1/2)·m·v²", isFormula: true },
      { title: "Étape 3", content: "v² = 2·g·h = 2 × 9,8 × 5 = 98 m²/s²", isFormula: true },
      { title: "Étape 4", content: "v = √98 ≈ 9,9 m/s", isFormula: true },
    ],
    finalAnswer: "v ≈ 9,9 m/s",
  };
  const ht = {
    problemStatement: "Yon kò ki gen mas m = 2 kg tonbe soti nan yon wotè h = 5 m. Kalkile vitès li lè l rive atè.",
    hypothese: "Bay : m = 2 kg, h = 5 m, g = 9,8 m/s². N ap chèche vitès v atè.",
    formule: "Konsèvasyon enèji : m·g·h = ½·m·v² ⟹ v = √(2·g·h)",
    steps: [
      { title: "Etap 1", content: "Sèl pwa a ap travay. Enèji mekanik la konsève.", isFormula: false },
      { title: "Etap 2", content: "m·g·h = (1/2)·m·v²", isFormula: true },
      { title: "Etap 3", content: "v² = 2·g·h = 2 × 9,8 × 5 = 98 m²/s²", isFormula: true },
      { title: "Etap 4", content: "v = √98 ≈ 9,9 m/s", isFormula: true },
    ],
    finalAnswer: "v ≈ 9,9 m/s",
  };
  return lang === "ht" ? ht : fr;
}
