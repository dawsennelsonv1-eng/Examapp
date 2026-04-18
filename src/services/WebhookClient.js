// src/services/webhookClient.js
// Routes requests through Make.com / n8n webhooks that forward to Claude AI.
// The persona and strict formatting rules are enforced in the PAYLOAD sent to the webhook,
// so the n8n flow passes them straight into Claude's system prompt.

import { WEBHOOKS } from "../utils/constants";

const HAITIAN_PROFESSOR_SYSTEM = `
Ou se yon pwofesè ayisyen ki gen 30 an eksperyans ap prepare elèv pou egzamen MENFP.
Ou sevè, dirèk, san detou. Ou pa janm sèvi ak metòd ameriken jeneralize.
Ou konnen egzakteman ki pyèj egzaminatè yo tabli chak ane.

FÒMATE TOUT SOLISYON MATEMATIK AK FIZIK LAN JAN SA:
1. Hypothèse  — Sa ki bay nan pwoblèm nan, sa n ap chèche.
2. Formule    — Fòmil ki aplike, avèk jistifikasyon kout.
3. Résolution — Kalkil etap pa etap, avèk inite ki kòrèk.

Pa janm sote yon etap. Pa janm bay repons san kontèks.
Si elèv la mande eksplikasyon nan Kreyòl, reponn an Kreyòl ayisyen natif.
Si an Fransè, reponn an fransè akademik klè.
`.trim();

/**
 * Core webhook caller. In dev, falls back to mock data if the webhook isn't reachable.
 */
async function callWebhook(endpoint, payload, { mockFallback } = {}) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Timeout via AbortController
      signal: AbortSignal.timeout?.(15000),
    });
    if (!res.ok) throw new Error(`Webhook ${endpoint} returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[webhook] fallback to mock:", err.message);
    if (mockFallback) return mockFallback();
    throw err;
  }
}

/**
 * Solve a scanned problem. Returns a structured, step-based solution
 * with Hypothèse / Formule / Résolution sections for math & physics.
 */
export async function solveProblem({ imageData, textHint, subject, track, lang }) {
  const payload = {
    system: HAITIAN_PROFESSOR_SYSTEM,
    task: "solve_problem",
    input: {
      imageDataUrl: imageData || null,
      problemText: textHint || null,
      subject,
      track,
      language: lang,
    },
    output_format: {
      type: "structured_solution",
      schema: {
        problemStatement: "string",
        hypothese: "string",
        formule: "string",
        steps: [{ title: "string", content: "string", isFormula: "boolean" }],
        finalAnswer: "string",
      },
    },
  };

  return callWebhook(WEBHOOKS.SOLVE, payload, {
    mockFallback: () => mockPhysicsSolution(lang),
  });
}

/**
 * Re-fetch with an alternative analogy / approach — "Eksplike m sa yon lòt jan".
 */
export async function explainDifferently({ originalProblem, previousExplanation, lang }) {
  const payload = {
    system: HAITIAN_PROFESSOR_SYSTEM,
    task: "explain_differently",
    input: {
      originalProblem,
      previousExplanation,
      instruction:
        "Rebay eksplikasyon an ak yon analoji diferan. Sèvi ak yon egzanp konkrè nan lavi ayisyen an si sa posib.",
      language: lang,
    },
  };
  return callWebhook(WEBHOOKS.EXPLAIN_DIFFERENTLY, payload, {
    mockFallback: () => ({
      analogy:
        lang === "ht"
          ? "Imajine ou gen yon bokit dlo w ap pote nan tèt ou..."
          : "Imagine que tu portes un seau d'eau sur ta tête...",
      steps: [],
    }),
  });
}

/** Mock data shipped with the app — lets the Scan & Solve UI be demoed offline. */
function mockPhysicsSolution(lang) {
  const fr = {
    problemStatement:
      "Un corps de masse m = 2 kg est lâché d'une hauteur h = 5 m. Calculer sa vitesse à l'arrivée au sol (g = 9,8 m/s²).",
    hypothese:
      "Donné : m = 2 kg, h = 5 m, g = 9,8 m/s². On néglige les frottements. On cherche la vitesse v au sol.",
    formule:
      "Conservation de l'énergie mécanique : Eₚ(initiale) = E_c(finale) ⟹ m·g·h = ½·m·v² ⟹ v = √(2·g·h)",
    steps: [
      { title: "Étape 1", content: "Identifier les forces : seul le poids travaille. L'énergie mécanique se conserve.", isFormula: false },
      { title: "Étape 2", content: "Poser l'équation : m·g·h = (1/2)·m·v²", isFormula: true },
      { title: "Étape 3", content: "Simplifier par m : g·h = (1/2)·v² ⟹ v² = 2·g·h", isFormula: true },
      { title: "Étape 4", content: "Substituer : v² = 2 × 9,8 × 5 = 98 m²/s²", isFormula: true },
      { title: "Étape 5", content: "v = √98 ≈ 9,9 m/s", isFormula: true },
    ],
    finalAnswer: "v ≈ 9,9 m/s",
  };
  const ht = {
    problemStatement:
      "Yon kò ki gen mas m = 2 kg tonbe soti nan yon wotè h = 5 m. Kalkile vitès li lè l rive atè (g = 9,8 m/s²).",
    hypothese:
      "Bay : m = 2 kg, h = 5 m, g = 9,8 m/s². Nou neglije fwotman. N ap chèche vitès v atè.",
    formule:
      "Konsèvasyon enèji mekanik : Eₚ(inisyal) = E_c(final) ⟹ m·g·h = ½·m·v² ⟹ v = √(2·g·h)",
    steps: [
      { title: "Etap 1", content: "Idantifye fòs yo : sèl pwa a ap travay. Enèji mekanik la konsève.", isFormula: false },
      { title: "Etap 2", content: "Mete ekwasyon an : m·g·h = (1/2)·m·v²", isFormula: true },
      { title: "Etap 3", content: "Senplifye pa m : g·h = (1/2)·v² ⟹ v² = 2·g·h", isFormula: true },
      { title: "Etap 4", content: "Ranplase : v² = 2 × 9,8 × 5 = 98 m²/s²", isFormula: true },
      { title: "Etap 5", content: "v = √98 ≈ 9,9 m/s", isFormula: true },
    ],
    finalAnswer: "v ≈ 9,9 m/s",
  };
  return lang === "ht" ? ht : fr;
}
