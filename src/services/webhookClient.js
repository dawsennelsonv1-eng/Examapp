// src/services/webhookClient.js
// Production webhook client for Laureat AI.
// Routes all AI calls through Make.com webhooks which forward to Gemini APIs.
//
// This file is the single source of truth for:
//   - Haitian professor system prompts (sent in every payload)
//   - Request/response contracts (matches /docs/makecom-scenarios/)
//   - Retry + timeout logic
//   - Mock fallbacks for dev/offline
//
// Each function returns Promise<Result> where Result is the typed response
// documented in the corresponding Make.com scenario spec.

import { WEBHOOKS } from "../utils/constants";

// ============================================================
// SYSTEM PROMPTS
// Keep these in sync with what Make.com scenarios inject.
// If you change the prompt here, update Make.com too.
// ============================================================

export const SYSTEM_PROMPTS = {
  professor: `
Ou se yon pwofesè ayisyen ki gen 30 an eksperyans ap prepare elèv pou egzamen MENFP.
Ou sevè, dirèk, san detou. Ou pa janm sèvi ak metòd ameriken jeneralize.
Ou konnen egzakteman ki pyèj egzaminatè yo tabli chak ane.

RÈG FÒMAT ABSOLI pou matematik/fizik:
1. Donnée     — Sa ki bay nan pwoblèm nan, sa n ap chèche. Avèk inite SI.
2. Formule    — Fòmil ki aplike, avèk jistifikasyon kout.
3. Résolution — Kalkil etap pa etap, avèk inite ki kòrèk.

REGLES STRIKES:
- Pa janm sote seksyon Donnée. Si ou sote li, repons ou REJETE.
- Toujou sèvi ak vigil (,) pou nonb desimal, pa pwen (.).
- Toujou mete inite SI (m, s, kg, N, J, etc.)
- Pa janm bay repons san kontèks.

LANG:
- Si elèv la ekri an Kreyòl, reponn an Kreyòl ayisyen natif.
- Si an Fransè, reponn an fransè akademik klè.
- Nan tèm teknik akademik, toujou sèvi ak fransè (on sait que, alors, si... alors, donc).
- Melanje Kreyòl pou esplikasyon, Fransè pou tèm matematik/syantifik.
`.trim(),

  tutor: `
Ou se yon pwofesè ayisyen virtuèl nan yon salon klas. Elèv la ap diskite avèk ou.
Ou pasyan, dirèk, e ou janmen bay repons ki twò long.

STIL KONVÈSASYON:
- Reponn tankou yon vrè pwofesè ki la ap pale ak elèv la.
- Mete yon kesyon nan repons ou si sa gen sans, pou asire elèv la swiv.
- Itilize ekzanp konkrè de lavi ayisyen lè posib.
- Kòmansman yon eksplikasyon: "Bon, gade sa... " oswa "Pwen nan kesyon sa a se..."

CODE-SWITCHING (ENPÒTAN):
- Kreyòl pou aksyon, ankourajman, navigasyon.
- Fransè pou tèm teknik: "on sait que", "alors", "donc", "soit", "d'après la formule".

LIMIT:
- Pa depase 3-4 fraz pa repons sof si elèv la mande plis detay.
- Pa janm fè yon diskou. Kondwi konvèsasyon an.
`.trim(),

  boardArtist: `
Ou se yon pwofesè ki ap desine sou tablo blan pou ede elèv konprann.
Ou jenere kòd SVG valid pou ilistrasyon edikatif nan matematik ak fizik.

REGLES:
- SVG dwe gen viewBox "0 0 400 300" oswa "0 0 600 400".
- Sèvi ak stroke="currentColor" pou liy yo (adapte ak tèm ki klè/fonse).
- Koulè ax (atansyon) dwe #ef4444 wouj, ak koulè prensipal #8b5cf6 violèt.
- Mete tèks fransè/matematik klè avèk font-size 12-16.
- Senp ak klè. Pa SVG ki twò chaje.
- Retounen SELMAN kòd SVG, pa gen eksplikasyon.
`.trim(),
};

// ============================================================
// CORE FETCH WRAPPER
// ============================================================

/**
 * Makes a webhook request with timeout, retries, and error handling.
 * Every AI endpoint flows through here.
 */
async function callWebhook(endpoint, payload, options = {}) {
  const {
    timeout = 30_000,
    retries = 1,
    mockFallback = null,
  } = options;

  // Detect unconfigured webhook URL (still has REPLACE-WITH placeholder)
  if (typeof endpoint === "string" && endpoint.includes("REPLACE-WITH")) {
    console.warn(`[webhook] ${endpoint} not configured — using mock.`);
    if (mockFallback) return mockFallback();
    throw new WebhookError("NOT_CONFIGURED", "Webhook URL not set in constants.js");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 429) {
        throw new WebhookError("RATE_LIMITED", "Too many requests");
      }
      if (res.status >= 500) {
        throw new WebhookError("SERVER_ERROR", `Server returned ${res.status}`);
      }
      if (!res.ok) {
        throw new WebhookError("BAD_REQUEST", `Webhook returned ${res.status}`);
      }

      const data = await res.json();

      // Make.com sometimes wraps response in { status, data }
      // Normalize: unwrap if we see that pattern
      if (data && typeof data === "object" && "data" in data && !("content" in data)) {
        return data.data;
      }
      return data;
    } catch (err) {
      const isLastAttempt = attempt === retries;
      if (err.name === "AbortError") {
        if (isLastAttempt) {
          if (mockFallback) {
            console.warn("[webhook] timeout, using mock");
            return mockFallback();
          }
          throw new WebhookError("TIMEOUT", "Request took too long");
        }
      } else if (isLastAttempt) {
        if (mockFallback) {
          console.warn("[webhook] failed, using mock:", err.message);
          return mockFallback();
        }
        throw err;
      }
      // Exponential backoff between retries
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

export class WebhookError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WebhookError";
    this.code = code;
  }
}

// ============================================================
// 1. SCAN & SOLVE
// ============================================================

/**
 * Step 1: OCR — extract text from a scanned image of an exercise.
 * Make.com scenario: scenario-1-ocr-scan
 */
export async function extractTextFromImage({ imageDataUrl, userId = "anonymous" }) {
  return callWebhook(WEBHOOKS.OCR_SCAN, {
    userId,
    image: imageDataUrl, // base64 data URL
    timestamp: Date.now(),
  }, {
    mockFallback: () => ({
      text: "Un corps de masse m = 2 kg est lâché d'une hauteur h = 5 m. Calculer sa vitesse à l'arrivée au sol (g = 9,8 m/s²).",
      confidence: 0.92,
      language: "fr",
    }),
  });
}

/**
 * Step 2: Solve the extracted problem.
 * Make.com scenario: scenario-2-solve-problem
 */
export async function solveProblem({ problemText, imageData = null, subject, track, userId = "anonymous" }) {
  return callWebhook(WEBHOOKS.SOLVE, {
    userId,
    systemPrompt: SYSTEM_PROMPTS.professor,
    input: {
      problemText,
      imageData,
      subject,
      track,
    },
    responseFormat: {
      type: "json_object",
      schema: {
        problemStatement: "string",
        donnee: "string",
        formule: "string",
        steps: [{ title: "string", content: "string", isFormula: "boolean" }],
        finalAnswer: "string",
        traps: ["string"], // optional: common mistakes to watch for
      },
    },
    timestamp: Date.now(),
  }, {
    timeout: 45_000, // solving takes longer
    mockFallback: () => mockSolution(),
  });
}

// Convenience: one-shot scan → solve
export async function scanAndSolve({ imageDataUrl, subject, track, userId }) {
  // For MVP, Make.com can handle both in one scenario.
  // The frontend just passes the image and the scenario chains OCR → solve.
  return callWebhook(WEBHOOKS.SOLVE, {
    userId,
    systemPrompt: SYSTEM_PROMPTS.professor,
    input: {
      imageData: imageDataUrl,
      subject,
      track,
      mode: "scan_and_solve", // tells scenario to do OCR first
    },
    timestamp: Date.now(),
  }, {
    timeout: 60_000,
    mockFallback: () => mockSolution(),
  });
}

// ============================================================
// 2. CLASSROOM TUTOR CHAT
// ============================================================

/**
 * Send a message to the tutor. Returns the tutor's reply plus optional
 * board SVG if the tutor decides to draw.
 * Make.com scenario: scenario-3-tutor-chat
 */
export async function sendTutorMessage({
  sessionId,
  messages, // full message history for context
  userMessage,
  context = null, // { fromStep, problem, stepTitle } if opened from ScanSolve
  userId = "anonymous",
  planTier = "free",
}) {
  return callWebhook(WEBHOOKS.TUTOR_CHAT, {
    sessionId,
    userId,
    planTier,
    systemPrompt: SYSTEM_PROMPTS.tutor,
    context,
    messages, // array of { role: "user" | "tutor", content: string }
    userMessage,
    timestamp: Date.now(),
  }, {
    timeout: 30_000,
    mockFallback: () => mockTutorReply(userMessage),
  });
}

// ============================================================
// 3. EXPLAIN A SPECIFIC STEP
// ============================================================

/**
 * Get an adaptive explanation for a step the student didn't understand.
 * Make.com scenario: scenario-4-explain-step
 */
export async function explainStep({
  problemStatement,
  stepTitle,
  stepContent,
  previousExplanation = null,
  userId = "anonymous",
}) {
  return callWebhook(WEBHOOKS.EXPLAIN_STEP, {
    userId,
    systemPrompt: SYSTEM_PROMPTS.professor,
    input: {
      problemStatement,
      stepTitle,
      stepContent,
      previousExplanation,
      instruction: previousExplanation
        ? "L'élève n'a pas compris la première explication. Rebay eksplikasyon an ak yon analoji diferan."
        : "Esplike etap sa a ak plis detay e egzanp konkrè.",
    },
    timestamp: Date.now(),
  }, {
    mockFallback: () => ({
      explanation: `Cette étape consiste à ${stepTitle.toLowerCase()}. L'idée : on applique le principe vu précédemment en remplaçant chaque variable par sa valeur numérique. Vérifie toujours que les unités sont cohérentes.`,
      analogy: "Imagine que tu portes un seau d'eau sur ta tête...",
    }),
  });
}

// ============================================================
// 4. GENERATE VIRTUAL BOARD SVG
// ============================================================

/**
 * Generate an educational SVG for the virtual board.
 * Make.com scenario: scenario-5-generate-board
 */
export async function generateBoard({
  topic,
  description,
  subject = "Physique",
  userId = "anonymous",
  planTier = "free",
}) {
  return callWebhook(WEBHOOKS.GENERATE_BOARD, {
    userId,
    planTier,
    systemPrompt: SYSTEM_PROMPTS.boardArtist,
    input: {
      topic,
      description,
      subject,
    },
    timestamp: Date.now(),
  }, {
    timeout: 30_000,
    mockFallback: () => ({
      svg: mockForceSvg(),
      title: topic || "Schéma",
    }),
  });
}

// ============================================================
// 5. GENERATE QUIZ
// ============================================================

/**
 * Generate fresh quiz questions on demand.
 * Make.com scenario: scenario-6-generate-quiz
 */
export async function generateQuiz({
  subject,
  difficulty = "moyen",
  count = 5,
  userId = "anonymous",
}) {
  return callWebhook(WEBHOOKS.GENERATE_QUIZ, {
    userId,
    systemPrompt: SYSTEM_PROMPTS.professor,
    input: { subject, difficulty, count },
    timestamp: Date.now(),
  }, {
    timeout: 45_000,
    mockFallback: () => ({ questions: [] }),
  });
}

// ============================================================
// MOCK DATA (used when webhook fails or isn't configured)
// ============================================================

function mockSolution() {
  return {
    problemStatement: "Un corps de masse m = 2 kg est lâché d'une hauteur h = 5 m. Calculer sa vitesse à l'arrivée au sol (g = 9,8 m/s²).",
    donnee: "Donné : m = 2 kg, h = 5 m, g = 9,8 m/s². On néglige les frottements. On cherche la vitesse v au sol.",
    formule: "Conservation de l'énergie mécanique : m·g·h = ½·m·v² ⟹ v = √(2·g·h)",
    steps: [
      { title: "Étape 1", content: "Identifier les forces : seul le poids travaille.", isFormula: false },
      { title: "Étape 2", content: "m·g·h = (1/2)·m·v²", isFormula: true },
      { title: "Étape 3", content: "v² = 2·g·h", isFormula: true },
      { title: "Étape 4", content: "v² = 2 × 9,8 × 5 = 98 m²/s²", isFormula: true },
      { title: "Étape 5", content: "v = √98 ≈ 9,9 m/s", isFormula: true },
    ],
    finalAnswer: "v ≈ 9,9 m/s",
    traps: ["Oublier de convertir les unités", "Confondre énergie cinétique et potentielle"],
  };
}

function mockTutorReply(userMessage) {
  return {
    reply: "D'accord, m ap esplike w sa. On sait que dans ce type de problème, on applique la conservation de l'énergie. Kisa w pa konprann egzakteman ?",
    shouldDrawBoard: userMessage.toLowerCase().includes("schéma") || userMessage.toLowerCase().includes("dessine"),
    boardSvg: userMessage.toLowerCase().includes("schéma") ? mockForceSvg() : null,
  };
}

function mockForceSvg() {
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-md">
    <line x1="50" y1="220" x2="350" y2="220" stroke="currentColor" stroke-width="2"/>
    <rect x="170" y="170" width="60" height="50" fill="#8b5cf6" rx="4"/>
    <text x="200" y="202" text-anchor="middle" fill="white" font-size="14" font-weight="bold">m</text>
    <line x1="200" y1="170" x2="200" y2="100" stroke="#ef4444" stroke-width="2" marker-end="url(#arrow1)"/>
    <text x="210" y="135" fill="#ef4444" font-size="13" font-weight="bold">P = m·g</text>
    <line x1="170" y1="145" x2="170" y2="100" stroke="currentColor" stroke-width="2" marker-end="url(#arrow2)"/>
    <text x="120" y="130" fill="currentColor" font-size="12">h = 5 m</text>
    <defs>
      <marker id="arrow1" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#ef4444"/></marker>
      <marker id="arrow2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="currentColor"/></marker>
    </defs>
  </svg>`;
}

// Legacy function kept for compatibility with existing components
export async function explainDifferently({ originalProblem, previousExplanation, lang }) {
  const result = await explainStep({
    problemStatement: originalProblem,
    stepTitle: "",
    stepContent: previousExplanation || "",
    previousExplanation,
  });
  return {
    analogy: result.analogy || result.explanation,
    steps: [],
  };
}
