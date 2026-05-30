// api/solve.js v19
//
// NEW MODES:
//   mode = "solve"   → solve the exercise (default)
//   mode = "verify"  → student already solved; AI checks their work
//
// MULTI-EXERCISE DETECTION:
//   AI first scans for exercise count. If multiple found, returns
//   { multipleExercises: true, exercises: [...] } and frontend asks user which one.
//
// RICHER OUTPUT:
//   - keyFormulas[] — formulas student must know
//   - summary (longer, pedagogical paragraph)
//   - produitsEnCroix[] — cross-multiplication relations when applicable
//   - mistakes/feedback when mode=verify

const OCR_MODELS = [
  "google/gemini-3.5-flash-lite",
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-pro",
];

const SOLVE_MODELS = [
  "openai/gpt-5.5",
  "anthropic/claude-opus-4.7",
  "google/gemini-3.1-pro",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId, input, mode = "solve", selectedExerciseIndex = null } = req.body || {};
    if (!input) return res.status(400).json({ error: "Missing input" });
    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    const subject = input.subject || "Physique";
    const track = input.track || "NS4";

    // ============== STAGE 1: Detect exercise count + extract ==============
    let extracted = null;
    let ocrModel = null;

    if (input.problemText) {
      // Text input — single exercise assumed
      extracted = { count: 1, exercises: [{ enonce: input.problemText, hasUserSolution: false }] };
      ocrModel = "user-text-input";
    } else if (input.imageData) {
      // Image — scan first to count exercises
      for (const model of OCR_MODELS) {
        const result = await detectAndExtract(input.imageData, model, KEY, mode);
        if (result) {
          extracted = result;
          ocrModel = model;
          break;
        }
      }
      if (!extracted) {
        return res.status(422).json({
          error: "ocr_failed",
          message: "L'image n'est pas assez claire. Mete plis limyè epi pwoche kamera a.",
        });
      }
    } else {
      return res.status(400).json({ error: "Either problemText or imageData required" });
    }

    // ============== STAGE 2: Multi-exercise routing ==============
    if (extracted.count > 1 && selectedExerciseIndex === null) {
      // Frontend will display the list and ask user which one
      return res.status(200).json({
        data: {
          multipleExercises: true,
          count: extracted.count,
          exercises: extracted.exercises.map((ex, i) => ({
            index: i,
            number: ex.number || (i + 1),
            preview: (ex.enonce || "").substring(0, 200),
            hasUserSolution: Boolean(ex.hasUserSolution),
          })),
          ocrModel,
        },
      });
    }

    // ============== STAGE 3: Solve or Verify ==============
    const targetExercise = selectedExerciseIndex !== null
      ? extracted.exercises[selectedExerciseIndex]
      : extracted.exercises[0];

    if (!targetExercise) return res.status(422).json({ error: "No exercise extracted" });

    const isVerify = mode === "verify" && targetExercise.hasUserSolution;

    let solution = null;
    let solveModel = null;
    for (const model of SOLVE_MODELS) {
      const result = isVerify
        ? await verifyWork(targetExercise, model, KEY, subject, track)
        : await solveExercise(targetExercise, model, KEY, subject, track);
      if (result) {
        solution = result;
        solveModel = model;
        break;
      }
    }

    if (!solution) {
      return res.status(502).json({ error: "AI couldn't solve. Try again." });
    }

    return res.status(200).json({
      data: {
        ...solution,
        ocrModel,
        modelUsed: solveModel,
        mode: isVerify ? "verify" : "solve",
      },
    });
  } catch (err) {
    console.error("/api/solve error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

// -------------------- Extract & detect count --------------------
async function detectAndExtract(imageData, model, apiKey, mode) {
  const prompt = `Tu analyses l'image d'une page d'exercices scolaires haïtiens.

ÉTAPE 1: Compte combien d'exercices distincts sont visibles (numérotés 1, 2, 3, ou Exercice I, II, etc).

ÉTAPE 2: Pour CHAQUE exercice, extrais:
- "number": le numéro/identifiant
- "enonce": l'énoncé complet en texte propre
- "hasUserSolution": true si l'utilisateur a déjà écrit une solution (écriture manuscrite après l'énoncé), false sinon
- "userSolutionText": (si hasUserSolution=true) transcription de ce que l'utilisateur a écrit

Réponds UNIQUEMENT en JSON:
{
  "count": <nombre>,
  "exercises": [
    { "number": "1", "enonce": "...", "hasUserSolution": false, "userSolutionText": null },
    ...
  ]
}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://laureatai.com",
        "X-Title": "Laureat AI",
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageData } },
          ],
        }],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw.replace(/```json\s*|\s*```/g, "").trim());
      if (Array.isArray(parsed.exercises) && parsed.exercises.length > 0) return parsed;
    } catch {}
    return null;
  } catch {
    return null;
  }
}

// -------------------- Solve mode --------------------
async function solveExercise(exercise, model, apiKey, subject, track) {
  const prompt = `Tu es un professeur haïtien qui prépare un élève (niveau ${track}) à son examen national.
Matière: ${subject}.

EXERCICE:
${exercise.enonce}

Réponds en JSON strict:
{
  "enonce": "énoncé reformulé clairement",
  "donnees": [
    { "symbol": "L", "value": "15", "unit": "cm" },
    { "symbol": "v", "value": "?", "isQuestion": true }
  ],
  "keyFormulas": [
    { "name": "Loi d'Ohm", "expression": "U = R × I", "explanation": "tension = résistance × intensité" },
    { "name": "...", "expression": "...", "explanation": "..." }
  ],
  "sections": [
    {
      "number": "1",
      "verb": "Calcul de",
      "title": "la vitesse moyenne",
      "steps": [
        { "type": "formula", "content": "v = d / t" },
        { "type": "conversion", "content": "10 km = 10 000 m" },
        { "type": "substitution", "content": "v = 10000 / 600" },
        { "type": "result", "content": "v = 16,67 m/s", "boxed": true }
      ]
    }
  ],
  "produitsEnCroix": [
    { "leftTop": "1 min", "leftBottom": "10 min", "rightTop": "60 s", "rightBottom": "x s", "result": "x = 600 s" }
  ],
  "summary": "Paragraphe pédagogique (4-6 phrases) résumant la stratégie de résolution, les concepts clés impliqués, et ce que l'élève doit retenir pour des exercices similaires. Inclut les formules essentielles à mémoriser. Décimales avec virgule.",
  "traps": ["piège fréquent 1", "piège 2"]
}

RÈGLES:
- Décimales avec virgule (9,8 pas 9.8)
- Si l'exercice utilise des proportions (règle de trois), INCLUS produitsEnCroix
- keyFormulas doit lister TOUTES les formules nécessaires pour résoudre, même celles évidentes
- summary doit être pédagogique et complet (4-6 phrases minimum)
- AUCUN markdown, AUCUN LaTeX dans les chaînes`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://laureatai.com",
        "X-Title": "Laureat AI",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 3000,
        temperature: 0.2,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw.replace(/```json\s*|\s*```/g, "").trim());
      return parsed;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

// -------------------- Verify mode --------------------
async function verifyWork(exercise, model, apiKey, subject, track) {
  const prompt = `Tu es un professeur haïtien (niveau ${track}, matière ${subject}).
Un élève t'a montré son exercice ET sa tentative de solution. Évalue son travail.

EXERCICE:
${exercise.enonce}

SOLUTION DE L'ÉLÈVE:
${exercise.userSolutionText || "(non lisible)"}

Réponds en JSON:
{
  "enonce": "énoncé reformulé",
  "donnees": [...],
  "keyFormulas": [...],
  "verdict": "correct" | "partiellement_correct" | "incorrect",
  "verdictScore": <0-100>,
  "userMistakes": [
    { "where": "étape 2", "description": "erreur de conversion d'unités", "correction": "10 km = 10 000 m, pas 1 000" }
  ],
  "userStrengths": ["a bien identifié la formule", "calculs propres"],
  "correctSolution": {
    "sections": [...]   // même format que mode solve
  },
  "produitsEnCroix": [...],
  "summary": "Paragraphe pédagogique (4-6 phrases) expliquant ce qui était bon, les erreurs principales, et comment éviter ces erreurs la prochaine fois.",
  "tips": ["conseil 1 pour des exercices similaires", "conseil 2"]
}

Sois encourageant mais honnête. Décimales avec virgule.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://laureatai.com",
        "X-Title": "Laureat AI",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 3000,
        temperature: 0.2,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    try {
      return JSON.parse(raw.replace(/```json\s*|\s*```/g, "").trim());
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}
