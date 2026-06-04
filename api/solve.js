// api/solve.js — v24 (Package 1: Scan engine)
//
// TWO-PHASE FLOW (so the énoncé shows fast and the solution streams in after):
//   phase = "extract" → OCR + subject detection + exercise count. FAST.
//        returns { subject, subjectFamily, count, exercises:[{enonce,...}], multipleExercises? }
//   phase = "solve"   → solve/verify ONE exercise using already-extracted text. SLOWER.
//        returns the full solution object.
//   (legacy: if no phase is given, behaves like the old all-in-one call.)
//
// SUBJECT-AWARE SOLVING:
//   subjectFamily = "sciences"  (math, physique, chimie)  → Données/Solution split
//   subjectFamily = "choice"    (biologie, histoire, langues, QCM, compléter)
//        → right answer + why the other plausible options are wrong + schema
//
// All AI output in French. Decimals with comma. No markdown/LaTeX in strings.

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

// Map a detected subject string to a solving family.
const SCIENCE_SUBJECTS = ["physique", "mathematiques", "mathématiques", "maths", "math", "chimie"];
function familyForSubject(subject) {
  const s = (subject || "").toLowerCase();
  return SCIENCE_SUBJECTS.some((x) => s.includes(x)) ? "sciences" : "choice";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      userId,
      input,
      mode = "solve",
      phase = null,                 // "extract" | "solve" | null(legacy)
      selectedExerciseIndex = null,
      // when phase === "solve", the client sends back what extract returned:
      preExtracted = null,          // { subject, subjectFamily, exercises }
    } = req.body || {};

    if (!input && !preExtracted) return res.status(400).json({ error: "Missing input" });
    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    const track = input?.track || "NS4";

    // ============================================================
    // PHASE: EXTRACT  (fast — OCR + subject + count, no solving)
    // ============================================================
    if (phase === "extract" || phase === null) {
      let extracted = null;
      let ocrModel = null;

      if (input?.problemText) {
        const subject = input.subject || "Général";
        extracted = {
          subject,
          subjectFamily: familyForSubject(subject),
          count: 1,
          exercises: [{ number: "1", enonce: input.problemText, hasUserSolution: false }],
        };
        ocrModel = "user-text-input";
      } else if (input?.imageData) {
        for (const model of OCR_MODELS) {
          const result = await detectAndExtract(input.imageData, model, KEY, mode);
          if (result) { extracted = result; ocrModel = model; break; }
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

      // Normalize the family in case the model didn't set it.
      extracted.subjectFamily = extracted.subjectFamily || familyForSubject(extracted.subject);

      const payload = {
        subject: extracted.subject || "Général",
        subjectFamily: extracted.subjectFamily,
        count: extracted.count || extracted.exercises?.length || 1,
        ocrModel,
        exercises: (extracted.exercises || []).map((ex, i) => ({
          index: i,
          number: ex.number || (i + 1),
          enonce: ex.enonce || "",
          preview: (ex.enonce || "").substring(0, 200),
          hasUserSolution: Boolean(ex.hasUserSolution),
          userSolutionText: ex.userSolutionText || null,
        })),
      };

      if (payload.count > 1) payload.multipleExercises = true;

      // If caller used the EXTRACT phase explicitly, return now.
      if (phase === "extract") {
        return res.status(200).json({ data: payload });
      }

      // LEGACY all-in-one: fall through and solve exercise 0 (or picker).
      if (payload.multipleExercises && selectedExerciseIndex === null) {
        return res.status(200).json({ data: payload });
      }
      const target = payload.exercises[selectedExerciseIndex ?? 0];
      const sol = await runSolve({ target, mode, subject: payload.subject, family: payload.subjectFamily, track, KEY });
      if (!sol.ok) return res.status(sol.status).json(sol.body);
      return res.status(200).json({ data: { ...sol.data, subject: payload.subject, subjectFamily: payload.subjectFamily, ocrModel } });
    }

    // ============================================================
    // PHASE: SOLVE  (slower — solve/verify one exercise)
    // ============================================================
    if (phase === "solve") {
      const ex = preExtracted?.exercises || [];
      const subject = preExtracted?.subject || input?.subject || "Général";
      const family = preExtracted?.subjectFamily || familyForSubject(subject);
      const target = ex[selectedExerciseIndex ?? 0];
      if (!target) return res.status(422).json({ error: "No exercise to solve" });

      const sol = await runSolve({ target, mode, subject, family, track, KEY });
      if (!sol.ok) return res.status(sol.status).json(sol.body);
      return res.status(200).json({ data: { ...sol.data, subject, subjectFamily: family } });
    }

    return res.status(400).json({ error: `Unknown phase: '${phase}'` });
  } catch (err) {
    console.error("/api/solve error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

// Run solve or verify across the model fallbacks. Returns {ok, data} or {ok:false,status,body}.
async function runSolve({ target, mode, subject, family, track, KEY }) {
  const isVerify = mode === "verify" && target.hasUserSolution;
  let solution = null;
  let solveModel = null;
  for (const model of SOLVE_MODELS) {
    const result = isVerify
      ? await verifyWork(target, model, KEY, subject, family, track)
      : await solveExercise(target, model, KEY, subject, family, track);
    if (result) { solution = result; solveModel = model; break; }
  }
  if (!solution) return { ok: false, status: 502, body: { error: "AI couldn't solve. Try again." } };
  return { ok: true, data: { ...solution, modelUsed: solveModel, mode: isVerify ? "verify" : "solve" } };
}

// -------------------- Extract & detect subject + count --------------------
async function detectAndExtract(imageData, model, apiKey, mode) {
  const prompt = `Tu analyses l'image d'une page d'exercices scolaires haïtiens.

ÉTAPE 1: Identifie la MATIÈRE (une seule): "Mathématiques", "Physique", "Chimie",
"Biologie", "Histoire", "Géographie", "Français", "Anglais", "Espagnol", ou autre.

ÉTAPE 2: Compte combien d'exercices distincts sont visibles (numérotés 1, 2, 3, ou
Exercice I, II, etc).

ÉTAPE 3: Pour CHAQUE exercice, extrais:
- "number": le numéro/identifiant
- "enonce": l'énoncé complet en texte propre
- "hasUserSolution": true si l'élève a déjà écrit une solution à la main, sinon false
- "userSolutionText": (si hasUserSolution=true) transcription de ce que l'élève a écrit

Réponds UNIQUEMENT en JSON:
{
  "subject": "<matière>",
  "count": <nombre>,
  "exercises": [
    { "number": "1", "enonce": "...", "hasUserSolution": false, "userSolutionText": null }
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
      if (Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
        parsed.subjectFamily = familyForSubject(parsed.subject);
        return parsed;
      }
    } catch {}
    return null;
  } catch {
    return null;
  }
}

// -------------------- Solve mode --------------------
async function solveExercise(exercise, model, apiKey, subject, family, track) {
  const prompt = family === "sciences"
    ? sciencesSolvePrompt(exercise, subject, track)
    : choiceSolvePrompt(exercise, subject, track);

  const parsed = await callJSON(model, apiKey, prompt);
  if (!parsed) return null;
  parsed.subjectFamily = family;
  return parsed;
}

function sciencesSolvePrompt(exercise, subject, track) {
  return `Tu es un professeur haïtien qui prépare un élève (niveau ${track}) à l'examen national.
Matière: ${subject}.

EXERCICE:
${exercise.enonce}

Réponds en JSON strict:
{
  "format": "sciences",
  "enonce": "énoncé reformulé clairement",
  "donnees": [
    { "symbol": "L", "value": "15", "unit": "cm" },
    { "symbol": "v", "value": "?", "isQuestion": true }
  ],
  "keyFormulas": [
    { "name": "Loi d'Ohm", "expression": "U = R × I", "explanation": "tension = résistance × intensité" }
  ],
  "sections": [
    {
      "number": "1",
      "verb": "Calcul de",
      "title": "la vitesse moyenne",
      "steps": [
        { "type": "formula", "content": "v = d / t" },
        { "type": "crossmultiply", "leftTop": "1 min", "leftBottom": "10 min", "rightTop": "60 s", "rightBottom": "x", "content": "x = 600 s" },
        { "type": "substitution", "content": "v = 10000 / 600" },
        { "type": "result", "content": "v = 16,67 m/s", "boxed": true }
      ]
    }
  ],
  "summary": "Paragraphe pédagogique CLAIR mais pas trop long (3-4 phrases): la stratégie, les concepts clés, et ce qu'il faut retenir pour des exercices similaires.",
  "traps": ["piège fréquent 1", "piège 2"]
}

RÈGLES:
- Décimales avec virgule (9,8 pas 9.8)
- "produits en croix" = quand tu utilises une règle de trois pour une conversion ou une
  proportion, mets-le comme un step de type "crossmultiply" À L'INTÉRIEUR de la section
  concernée (pas séparé). Garde-le discret: seulement quand c'est essentiel (ex: 1 min = 60 s).
- keyFormulas liste TOUTES les formules nécessaires
- summary: clair et complet mais concis (3-4 phrases), pas un mur de texte
- AUCUN markdown, AUCUN LaTeX dans les chaînes`;
}

function choiceSolvePrompt(exercise, subject, track) {
  return `Tu es un professeur haïtien (niveau ${track}, matière ${subject}).
Ce type de matière ne se résout PAS avec un format Données/Solution. C'est une question
de compréhension, un QCM, ou une question à compléter.

EXERCICE:
${exercise.enonce}

Réponds en JSON strict:
{
  "format": "choice",
  "enonce": "énoncé/question reformulé clairement",
  "correctAnswer": "la bonne réponse, formulée clairement",
  "whyCorrect": "explication pédagogique de POURQUOI c'est la bonne réponse (2-4 phrases)",
  "otherOptions": [
    { "option": "réponse plausible A", "whyWrong": "pourquoi elle est fausse" },
    { "option": "réponse plausible B", "whyWrong": "pourquoi elle est fausse" },
    { "option": "réponse plausible C", "whyWrong": "pourquoi elle est fausse" }
  ],
  "needsSchema": true,
  "schemaDescription": "si un schéma/diagramme aide à comprendre, décris-le ici en une phrase; sinon null",
  "keyFacts": ["fait/notion clé 1 à retenir", "fait clé 2"],
  "summary": "Paragraphe pédagogique clair (3-4 phrases) sur la notion testée et ce qu'il faut retenir."
}

RÈGLES:
- Donne TOUJOURS les 3 mauvaises réponses les plus probables avec la raison de leur rejet.
- needsSchema=true seulement si un visuel aide vraiment (anatomie, carte, cycle, etc).
- Pas de Données/Solution ici — c'est une explication.
- AUCUN markdown, AUCUN LaTeX dans les chaînes.`;
}

// -------------------- Verify mode --------------------
async function verifyWork(exercise, model, apiKey, subject, family, track) {
  const prompt = `Tu es un professeur haïtien (niveau ${track}, matière ${subject}).
Un élève t'a montré son exercice ET sa tentative. Évalue son travail.

EXERCICE:
${exercise.enonce}

SOLUTION DE L'ÉLÈVE:
${exercise.userSolutionText || "(non lisible)"}

Réponds en JSON (${family === "sciences" ? "format sciences" : "format choice"}):
{
  "format": "${family}",
  "enonce": "énoncé reformulé",
  ${family === "sciences" ? `"donnees": [...],
  "keyFormulas": [...],
  "correctSolution": { "sections": [...] },` : `"correctAnswer": "...",
  "whyCorrect": "...",
  "otherOptions": [{ "option": "...", "whyWrong": "..." }],`}
  "verdict": "correct" | "partiellement_correct" | "incorrect",
  "verdictScore": <0-100>,
  "userMistakes": [
    { "where": "étape 2", "description": "erreur de conversion", "correction": "10 km = 10 000 m" }
  ],
  "userStrengths": ["a bien identifié la formule"],
  "summary": "Paragraphe (3-4 phrases): ce qui était bon, les erreurs, comment éviter ça.",
  "tips": ["conseil 1", "conseil 2"]
}

Sois encourageant mais honnête. Décimales avec virgule. AUCUN markdown/LaTeX.`;

  const parsed = await callJSON(model, apiKey, prompt);
  if (!parsed) return null;
  parsed.subjectFamily = family;
  return parsed;
}

// -------------------- Shared OpenRouter JSON call --------------------
async function callJSON(model, apiKey, prompt) {
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
