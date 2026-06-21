// api/content.js
// MERGED endpoint that replaces board.js + lesson.js + brain.js + verify-payment.js.
// Routes by ?task= query param or body.task field.
//
// Usage from frontend:
//   POST /api/content?task=board          { description, subject, style, exerciseContext }
//   POST /api/content?task=lesson         { subject, chapter, event, track, language }
//   POST /api/content?task=brain          { task: "decision"|"chat"|..., prompt, messages, ... }
//   POST /api/content?task=verify_payment { accessToken, planTier, method, amount, proofType, ... }
//     (verify_payment merged here to stay under Vercel's 12-function cap.)

import { createClient } from "@supabase/supabase-js";

// Inlined admin client (was ./_supabaseAdmin — removed to avoid an ESM module
// resolution failure on Vercel that 500'd the whole endpoint). Server-only;
// uses the service role key which bypasses RLS. Never expose this client-side.
let _admin = null;
function getSupabaseAdmin() {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

const TASK_MODELS = {
  decision: ["anthropic/claude-opus-4.7", "google/gemini-3-pro-preview"],
  chat:     ["google/gemini-3-pro-preview", "anthropic/claude-opus-4.7", "openai/gpt-5.5"],
  board:    ["anthropic/claude-opus-4.7", "openai/gpt-5.5"],
  ocr:      ["google/gemini-3.5-flash-lite", "google/gemini-3-flash-preview"],
  solve:    ["openai/gpt-5.5", "anthropic/claude-opus-4.7", "google/gemini-3.1-pro"],
  verify:   ["anthropic/claude-opus-4.7", "openai/gpt-5.5"],
};

const LESSON_MODELS = [
  "anthropic/claude-opus-4.7",
  "google/gemini-3-pro-preview",
  "openai/gpt-5.5",
];

const BOARD_MODELS = [
  "google/gemini-3.1-pro",
  "openai/gpt-5.5",
  "anthropic/claude-opus-4.7",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const task = (req.query?.task || req.body?.task || "").toString().toLowerCase();

  // verify_payment uses the Supabase admin client; it doesn't require OPENROUTER
  // unless a screenshot needs OCR. Handle it before the OPENROUTER key check.
  if (task === "verify_payment") {
    try {
      return await handleVerifyPayment(req, res);
    } catch (err) {
      console.error("/api/content verify_payment error:", err);
      return res.status(500).json({ error: "Server error", message: err.message });
    }
  }

  const KEY = process.env.OPENROUTER_API_KEY;
  if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

  try {
    if (task === "board" || task === "diagram") {
      return await handleBoard(req, res, KEY);
    }
    if (task === "lesson") {
      return await handleLesson(req, res, KEY);
    }
    if (task === "solve" || task === "extract") {
      return await handleSolve(req, res);
    }
    if (task === "tts") {
      return await handleTTS(req, res);
    }
    if (task === "share") {
      return await handleShare(req, res);
    }
    if (task === "gen_quiz") {
      return await handleGenQuiz(req, res, KEY);
    }
    if (task === "exam_sign") {
      return await handleExamSign(req, res);
    }
    // "brain" router (or any of the brain task names like "decision", "chat", "verify")
    if (task === "brain" || TASK_MODELS[task]) {
      return await handleBrain(req, res, KEY, task === "brain" ? (req.body?.brainTask || "chat") : task);
    }
    return res.status(400).json({ error: `Unknown task: '${task}'. Valid: board, lesson, solve, extract, tts, share, gen_quiz, brain, verify_payment` });
  } catch (err) {
    console.error("/api/content error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

// ============== EXAM_SIGN (service-role signed upload URL) ==============
// The browser's anon upload() hits a Storage RLS/JWT path that 503s on this
// project. Here the SERVER (service-role) mints a one-time signed upload URL;
// the client uploads to it directly, bypassing that broken path entirely.
async function handleExamSign(req, res) {
  try {
    const { track = "NS4", year, subject } = req.body || {};
    const admin = getSupabaseAdmin();
    if (!admin) {
      return res.status(500).json({ error: "server_misconfig", message: "Service role indisponible côté serveur." });
    }
    const safeSubject = subject || "complet";
    const path = `${track}/${year || "x"}/${safeSubject}-${Date.now()}.pdf`;
    const { data, error } = await admin.storage.from("exams").createSignedUploadUrl(path);
    if (error) {
      let raw;
      try { raw = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error))); } catch { raw = String(error); }
      return res.status(502).json({ error: "sign_failed", message: error.message, raw });
    }
    return res.status(200).json({ data: { path: data?.path || path, token: data?.token } });
  } catch (e) {
    return res.status(500).json({ error: "exception", message: e?.message || "unknown" });
  }
}

// ============== GEN_QUIZ (AI quiz-bank generator, easy → hard) ==============
async function handleGenQuiz(req, res, KEY) {
  const {
    track = "NS4",
    subject = "mathematiques",
    subjectName = "",
    topic = "",            // chapter title
    chapterId = null,
    points = [],           // list of the chapter's lesson points (titles/summaries)
    count = 10,
    sourceExamId = null,
    store = true,
  } = req.body || {};

  // Cap per call so the serverless function never times out. For a full bank
  // (e.g. 100), the admin button calls this repeatedly in batches.
  const n = Math.max(1, Math.min(Number(count) || 10, 15));

  const subjLabel = subjectName || subject;
  const pointsBlock = Array.isArray(points) && points.length
    ? `\nLe chapitre couvre précisément ces points (couvre-les) :\n- ${points.slice(0, 12).join("\n- ")}`
    : "";

  const prompt = `Tu es un concepteur d'examens nationaux haïtiens (MENFP). Génère ${n} questions à choix multiple (QCM) pour l'examen ${track}, matière "${subjLabel}"${topic ? `, chapitre "${topic}"` : ""}.${pointsBlock}
RÈGLES:
- En français clair, niveau ${track}, style et difficulté des vrais examens MENFP.
- ORDONNE les questions de la PLUS FACILE à la PLUS DIFFICILE (progression douce, pour ne pas décourager l'élève).
- Exactement 4 options par question, UNE seule correcte.
- Explication courte et claire de la bonne réponse.
- Décimales avec virgule (9,8 pas 9.8). Unités SI. Pas de doublons.
- Reste STRICTEMENT dans le chapitre indiqué.
Réponds UNIQUEMENT en JSON valide:
{"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"...","difficulty":1}]}
"answer" = index (0-3) de la bonne option. "difficulty" = entier 1 (très facile) à 5 (très difficile), croissant dans la liste.`;

  let parsed = null;
  for (const model of ["google/gemini-3.1-pro", "openai/gpt-5.5", "anthropic/claude-opus-4.7"]) {
    parsed = await callJSON(model, KEY, prompt);
    if (parsed?.questions?.length) break;
  }

  const rawList = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const questions = rawList
    .map((q) => {
      const options = Array.isArray(q.options) ? q.options.map((o) => String(o)).slice(0, 4) : [];
      let answer = Number.isInteger(q.answer) ? q.answer : 0;
      if (answer < 0 || answer > options.length - 1) answer = 0;
      let difficulty = Number(q.difficulty);
      if (!(difficulty >= 1 && difficulty <= 5)) difficulty = 1;
      return {
        question: String(q.question || "").trim(),
        options,
        answer,
        explanation: String(q.explanation || "").trim(),
        difficulty: Math.round(difficulty),
      };
    })
    .filter((q) => q.question && q.options.length === 4)
    .sort((a, b) => a.difficulty - b.difficulty); // easy → hard

  if (questions.length === 0) {
    return res.status(502).json({ error: "Generation failed", message: "Le modèle n'a pas renvoyé de questions valides." });
  }

  const batch = `q_${Date.now()}`;
  let stored = 0;
  if (store) {
    try {
      const admin = getSupabaseAdmin();
      if (admin) {
        const rows = questions.map((q) => ({
          track, subject, topic: topic || null, chapter_id: chapterId,
          question: q.question, options: q.options, answer: q.answer,
          explanation: q.explanation, difficulty: q.difficulty,
          source_exam_id: sourceExamId, batch,
        }));
        const { error } = await admin.from("quizzes").insert(rows);
        if (!error) stored = rows.length;
        else console.warn("gen_quiz insert error:", error.message);
      }
    } catch (e) {
      console.warn("gen_quiz store failed:", e?.message);
    }
  }

  return res.status(200).json({
    data: { generated: questions.length, stored, batch, track, subject, topic, questions },
  });
}

// ============== BOARD (SVG diagram) ==============
async function handleBoard(req, res, KEY) {
  const { topic, description, subject = "Physique", style = "diagram", exerciseContext = null } = req.body || {};
  if (!description) return res.status(400).json({ error: "Missing description" });

  const prompt = `Tu es un illustrateur pédagogique. Génère un schéma SVG clair pour aider un élève haïtien à comprendre un concept.

SUJET: ${topic || "concept à illustrer"}
MATIÈRE: ${subject}
DESCRIPTION: ${description}
${exerciseContext ? `CONTEXTE: ${JSON.stringify(exerciseContext).substring(0, 800)}` : ""}

RÈGLES STRICTES:
- Génère UN seul élément <svg> complet (viewBox="0 0 400 300")
- Fond blanc (#ffffff)
- Couleurs: violet (#7c3aed) principal, ambre (#f59e0b) accent, slate (#1e293b) texte, vert (#10b981) résultats
- Labels en français
- Décimales avec virgule (9,8 pas 9.8)
- Police sans-serif 14-16px
- Flèches avec marker-end pour vecteurs/directions
- AUCUN texte avant ou après le SVG, JUSTE le SVG

Réponds avec le code SVG UNIQUEMENT, commençant par <svg et finissant par </svg>.`;

  for (const model of BOARD_MODELS) {
    const svg = await callOpenRouter(KEY, model, prompt, { jsonMode: false, maxTokens: 2500, temperature: 0.3 });
    if (!svg?.text) continue;
    const match = svg.text.match(/<svg[\s\S]*?<\/svg>/i);
    if (!match) continue;
    const cleaned = match[0].replace(/<script[\s\S]*?<\/script>/gi, "");
    if (!cleaned.includes("</svg>")) continue;
    return res.status(200).json({ data: { svg: cleaned, modelUsed: model, style } });
  }
  return res.status(502).json({ error: "Diagram generation failed" });
}

// ============== LESSON ==============
async function handleLesson(req, res, KEY) {
  const { subject, chapter, event, track = "NS4", language = "fr" } = req.body || {};
  if (!event?.title) return res.status(400).json({ error: "Missing event info" });

  const langInstr = language === "fr"
    ? "Réponds en français uniquement."
    : "Mélange français et kreyòl naturellement.";

  const prompt = `Tu es un professeur haïtien expérimenté qui prépare des élèves au niveau ${track} pour leur examen national.
${langInstr}

Crée une leçon détaillée et pédagogique pour:
- MATIÈRE: ${subject?.name || "Général"}
- CHAPITRE: ${chapter?.title || "?"} (${chapter?.subtitle || ""})
- LEÇON: ${event.title}
- RÉSUMÉ: ${event.summary || ""}

Format JSON STRICT:
{
  "title": "${event.title}",
  "intro": "Paragraphe d'introduction (3-4 phrases)",
  "sections": [
    {
      "heading": "1. Définition",
      "content": "Texte explicatif clair (2-4 paragraphes courts)",
      "formulas": ["F = m × a (force = masse × accélération)"],
      "example": "Exemple concret avec chiffres",
      "tip": "Astuce ou piège fréquent"
    }
  ],
  "keyTakeaways": ["Point 1", "Point 2", "Point 3"],
  "miniQuiz": [
    {
      "type": "multiple_choice",
      "question": "Question claire",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Pourquoi A est correct"
    }
  ]
}

RÈGLES:
- 3-5 sections, chacune avec content + au moins 1 example
- Au moins 5 questions dans miniQuiz, mix de multiple_choice et fill_blank
- Décimales avec virgule (9,8 m/s²)
- AUCUN markdown, AUCUN LaTeX
- Niveau ${track}: ${track === "9AF" ? "vocabulaire simple, exemples quotidiens" : "rigueur scientifique"}`;

  for (const model of LESSON_MODELS) {
    const result = await callOpenRouter(KEY, model, prompt, { jsonMode: true, maxTokens: 3500, temperature: 0.3 });
    if (result?.json) {
      const lesson = result.json;
      if (Array.isArray(lesson.miniQuiz)) {
        lesson.miniQuiz = lesson.miniQuiz.slice(0, 5).map((q, i) => ({
          id: `q_${i}`,
          type: q.type || "multiple_choice",
          question: q.question || "",
          options: Array.isArray(q.options) ? q.options : [],
          correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
          correctAnswer: q.correctAnswer || "",
          explanation: q.explanation || "",
        }));
      }
      return res.status(200).json({ data: { ...lesson, modelUsed: model } });
    }
  }
  return res.status(502).json({ error: "Failed to generate lesson" });
}

// ============== BRAIN (task router) ==============
async function handleBrain(req, res, KEY, brainTask) {
  const { prompt, messages, jsonMode = true, temperature = 0.4, maxTokens = 2000, imageData = null } = req.body || {};
  const candidates = TASK_MODELS[brainTask];
  if (!candidates) return res.status(400).json({ error: `Unknown brain task: ${brainTask}` });

  let userContent;
  if (imageData) {
    userContent = [
      { type: "text", text: prompt || "" },
      { type: "image_url", image_url: { url: imageData } },
    ];
  } else {
    userContent = prompt;
  }
  const apiMessages = Array.isArray(messages) && messages.length
    ? messages
    : [{ role: "user", content: userContent }];

  for (const model of candidates) {
    const result = await callOpenRouter(KEY, model, apiMessages, { jsonMode, maxTokens, temperature, isMessages: true });
    if (jsonMode && result?.json) {
      return res.status(200).json({ data: result.json, meta: { task: brainTask, modelUsed: model } });
    }
    if (!jsonMode && result?.text) {
      return res.status(200).json({ data: { text: result.text }, meta: { task: brainTask, modelUsed: model } });
    }
  }
  return res.status(502).json({ error: "All models failed" });
}

// ============== SHARED OpenRouter caller ==============
async function callOpenRouter(KEY, model, promptOrMessages, { jsonMode, maxTokens, temperature, isMessages = false }) {
  try {
    const body = {
      model,
      messages: isMessages ? promptOrMessages : [{ role: "user", content: promptOrMessages }],
      max_tokens: maxTokens,
      temperature,
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
        "HTTP-Referer": "https://laureatai.com",
        "X-Title": "Laureat AI",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    if (jsonMode) {
      try {
        const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
        return { json: JSON.parse(cleaned), text: raw };
      } catch {
        return { text: raw };
      }
    }
    return { text: raw };
  } catch (err) {
    console.warn(`Model ${model} failed:`, err.message);
    return null;
  }
}

// ============== VERIFY PAYMENT (merged from verify-payment.js) ==============
// POST /api/content?task=verify_payment
//   { accessToken, planTier, method, amount, proofType, transactionId?,
//     screenshotData?, customerName, customerWhatsapp }
async function handleVerifyPayment(req, res) {
  const admin = getSupabaseAdmin();
  if (!admin) return res.status(500).json({ error: "server not configured" });

  const {
    accessToken, planTier, method, amount, proofType,
    transactionId, screenshotData, customerName, customerWhatsapp,
  } = req.body || {};

  if (!accessToken) return res.status(401).json({ error: "not signed in" });
  if (!planTier || !method || !proofType) return res.status(400).json({ error: "missing fields" });

  // Identify the user securely from their token.
  const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
  if (userErr || !userData?.user) return res.status(401).json({ error: "invalid session" });
  const user = userData.user;

  // Resolve the transaction id (typed or OCR'd from the screenshot).
  let txId = (transactionId || "").trim();
  if (proofType === "screenshot") {
    if (!screenshotData) return res.status(400).json({ error: "no screenshot" });
    txId = await extractPaymentId(screenshotData);
    if (!txId) {
      return res.status(422).json({
        error: "ocr_failed",
        message: "Nou pa rive li ID a sou imaj la. Tape l alamen silvouplè.",
      });
    }
  }
  if (!txId) return res.status(400).json({ error: "no transaction id" });

  // Look up an unconsumed matching SMS.
  const { data: rows } = await admin
    .from("payment_sms").select("*")
    .eq("method", method).eq("transaction_id", txId).limit(1);
  const sms = rows?.[0];

  const baseTx = {
    user_id: user.id, plan_tier: planTier, method,
    amount: amount ?? sms?.amount ?? null,
    submitted_transaction_id: txId, proof_type: proofType,
    customer_name: customerName || null, customer_whatsapp: customerWhatsapp || null,
  };

  if (!sms) {
    await admin.from("transactions").insert({ ...baseTx, status: "pending", note: "no matching SMS yet" });
    return res.status(200).json({ data: { status: "pending", message: "Nou poko jwenn peman an. Tann kèk minit epi eseye ankò." } });
  }
  if (sms.consumed) {
    await admin.from("transactions").insert({ ...baseTx, status: "duplicate", matched_sms_id: sms.id, note: "id already used" });
    return res.status(200).json({ data: { status: "duplicate", message: "Sa ID transaksyon sa a deja itilize. Chak peman sèvi yon sèl fwa." } });
  }
  if (amount != null && sms.amount != null && Number(sms.amount) < Number(amount)) {
    await admin.from("transactions").insert({ ...baseTx, status: "rejected", matched_sms_id: sms.id, note: `amount ${sms.amount} < ${amount}` });
    return res.status(200).json({ data: { status: "rejected", message: `Montan an pa kòrèk. Nou resevwa ${sms.amount} HTG.` } });
  }

  // MATCH — consume the SMS atomically (only if still unconsumed), then upgrade.
  const { data: consumed } = await admin
    .from("payment_sms")
    .update({ consumed: true, consumed_by: user.id })
    .eq("id", sms.id).eq("consumed", false)
    .select().single();

  if (!consumed) {
    await admin.from("transactions").insert({ ...baseTx, status: "duplicate", matched_sms_id: sms.id, note: "race: consumed" });
    return res.status(200).json({ data: { status: "duplicate", message: "Sa ID transaksyon sa a deja itilize." } });
  }

  await admin.from("transactions").insert({ ...baseTx, status: "verified", matched_sms_id: sms.id });

  const expires = new Date();
  expires.setMonth(expires.getMonth() + 1);
  await admin.from("profiles").update({
    plan_tier: planTier,
    plan_started_at: new Date().toISOString(),
    plan_expires_at: expires.toISOString(),
  }).eq("id", user.id);

  return res.status(200).json({ data: { status: "verified", planTier, message: "Peman konfime! Ou gen aksè kounye a. 🎉" } });
}

async function extractPaymentId(imageData) {
  const KEY = process.env.OPENROUTER_API_KEY;
  if (!KEY) return null;
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash-lite",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Sou kaptiran ekran resi MonCash/NatCash sa a, jwenn SÈLMAN nimewo ID/transaction/reference la. Reponn JSON: {\"id\":\"...\"}. Si ou pa wè l, {\"id\":null}." },
            { type: "image_url", image_url: { url: imageData } },
          ],
        }],
        response_format: { type: "json_object" },
        max_tokens: 100,
        temperature: 0,
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw.replace(/```json\s*|\s*```/g, "").trim());
    return parsed?.id ? String(parsed.id).trim() : null;
  } catch {
    return null;
  }
}

// ============== SOLVE (merged from solve.js) ==============
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

async function handleSolve(req, res) {
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

// ============== SHARE (merged from share.js) ==============
// api/share.js — v24
// POST: create shareable session (returns shareId)
// GET: retrieve shared session by shareId
//
// FIX (Bug 3): @vercel/kv is imported LAZILY. A top-level
// `import { kv } from "@vercel/kv"` crashes the whole serverless function on
// cold start if the package isn't installed, which made every share fail
// silently. Now we try to load it at request time and fall back to an
// in-memory store if it's unavailable.

const memStore = new Map();

async function getKV() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try {
    const mod = await import("@vercel/kv");
    return mod.kv || null;
  } catch {
    return null;
  }
}

async function handleShare(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    try {
      const { type, payload } = req.body || {};
      if (!type || !payload) return res.status(400).json({ error: "Missing type or payload" });

      const shareId = `${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const data = { type, payload, createdAt: Date.now(), views: 0 };

      const kv = await getKV();
      if (kv) {
        await kv.set(`share:${shareId}`, data, { ex: 60 * 60 * 24 * 30 }); // 30 days
        await kv.incr("metrics:total_shares");
      } else {
        memStore.set(shareId, data);
      }

      return res.status(200).json({ data: { shareId, url: `/share/${shareId}` } });
    } catch (err) {
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "GET") {
    const { shareId } = req.query;
    if (!shareId) return res.status(400).json({ error: "Missing shareId" });

    try {
      let data;
      const kv = await getKV();
      if (kv) {
        data = await kv.get(`share:${shareId}`);
        if (data) {
          await kv.incr(`share:${shareId}:views`);
          await kv.incr("metrics:total_share_views");
        }
      } else {
        data = memStore.get(shareId);
      }

      if (!data) return res.status(404).json({ error: "Share not found or expired" });
      return res.status(200).json({ data });
    } catch (err) {
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ============== TTS (merged from tts.js) ==============
// api/tts.js
// v16 SPEED FIX:
//  - Uses streamGenerateContent endpoint so audio bytes return AS THEY'RE GENERATED.
//    First byte in ~500ms instead of 3-5s.
//  - Caps text to 600 chars per call (frontend splits per-sentence).
//  - Returns WAV (PCM wrapped).
//  - Diagnostic info in response so we can see what's actually happening.

const PERSONA_VOICES = {
  joseph:     { gemini: "Iapetus",  eleven: "VR6AewLTigWG4xSOukaG" },
  tikens:     { gemini: "Puck",     eleven: "pNInz6obpgDQGcFmaJgB" },
  victoria:   { gemini: "Aoede",    eleven: "XB0fDUnXU5powFXDhCwa" },
  marckenson: { gemini: "Charon",   eleven: "TxGEqnHWrfWFTfGW9XjX" },
  camille:    { gemini: "Leda",     eleven: "EXAVITQu4vr4xnSDxMaL" },
};

async function handleTTS(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const startTime = Date.now();

  try {
    const { text, persona = "joseph" } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text" });

    const cleanText = String(text).substring(0, 600).trim();
    const voice = PERSONA_VOICES[persona] || PERSONA_VOICES.joseph;

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;

    if (GEMINI_KEY) {
      const result = await geminiStreamTTS(cleanText, voice.gemini, GEMINI_KEY);
      if (result) {
        return res.status(200).json({
          data: {
            audioUrl: `data:audio/wav;base64,${result.wavBase64}`,
            backend: "gemini",
            modelUsed: "gemini-3.1-flash-tts-preview",
            elapsedMs: Date.now() - startTime,
          },
        });
      }
    }

    if (ELEVEN_KEY) {
      const audio = await elevenLabsTTS(cleanText, voice.eleven, ELEVEN_KEY);
      if (audio) {
        return res.status(200).json({
          data: {
            audioUrl: `data:audio/mpeg;base64,${audio}`,
            backend: "elevenlabs",
            modelUsed: "elevenlabs-multilingual-v2",
            elapsedMs: Date.now() - startTime,
          },
        });
      }
    }

    return res.status(200).json({
      data: { useBrowserFallback: true, text: cleanText, modelUsed: "browser-fallback" },
    });
  } catch (err) {
    console.error("/api/tts fatal:", err);
    return res.status(200).json({
      data: { useBrowserFallback: true, text: req.body?.text || "", modelUsed: "browser-fallback" },
    });
  }
}

async function geminiStreamTTS(text, voiceName, apiKey) {
  try {
    // streamGenerateContent gives us PCM bytes as they're synthesized (~500ms TTFB)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini stream TTS HTTP ${response.status}:`, errText.substring(0, 300));
      // Fall back to non-streaming if streaming fails
      return geminiNonStreamTTS(text, voiceName, apiKey);
    }

    // Parse SSE stream and collect all PCM chunks
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const pcmChunks = [];
    let sampleRate = 24000;
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.substring(6).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const inlineData = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (inlineData?.data) {
            pcmChunks.push(Buffer.from(inlineData.data, "base64"));
            const m = (inlineData.mimeType || "").match(/rate=(\d+)/);
            if (m) sampleRate = parseInt(m[1], 10);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    if (pcmChunks.length === 0) return geminiNonStreamTTS(text, voiceName, apiKey);

    const pcmBuffer = Buffer.concat(pcmChunks);
    const wavBuffer = pcmToWav(pcmBuffer, sampleRate, 1, 16);
    return { wavBase64: wavBuffer.toString("base64") };
  } catch (err) {
    console.error("Gemini stream TTS exception:", err.message);
    return geminiNonStreamTTS(text, voiceName, apiKey);
  }
}

async function geminiNonStreamTTS(text, voiceName, apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        }),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) return null;
    const pcmBuffer = Buffer.from(inlineData.data, "base64");
    let sampleRate = 24000;
    const m = (inlineData.mimeType || "").match(/rate=(\d+)/);
    if (m) sampleRate = parseInt(m[1], 10);
    const wavBuffer = pcmToWav(pcmBuffer, sampleRate, 1, 16);
    return { wavBase64: wavBuffer.toString("base64") };
  } catch {
    return null;
  }
}

function pcmToWav(pcmBuffer, sampleRate, numChannels, bitsPerSample) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  let o = 0;
  header.write("RIFF", o); o += 4;
  header.writeUInt32LE(36 + dataSize, o); o += 4;
  header.write("WAVE", o); o += 4;
  header.write("fmt ", o); o += 4;
  header.writeUInt32LE(16, o); o += 4;
  header.writeUInt16LE(1, o); o += 2;
  header.writeUInt16LE(numChannels, o); o += 2;
  header.writeUInt32LE(sampleRate, o); o += 4;
  header.writeUInt32LE(byteRate, o); o += 4;
  header.writeUInt16LE(blockAlign, o); o += 2;
  header.writeUInt16LE(bitsPerSample, o); o += 2;
  header.write("data", o); o += 4;
  header.writeUInt32LE(dataSize, o);
  return Buffer.concat([header, pcmBuffer]);
}

async function elevenLabsTTS(text, voiceId, apiKey) {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey, Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}
