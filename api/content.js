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

import { getSupabaseAdmin } from "./_supabaseAdmin";

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
  "anthropic/claude-opus-4.7",
  "openai/gpt-5.5",
  "google/gemini-3.1-pro",
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
    // "brain" router (or any of the brain task names like "decision", "chat", "verify")
    if (task === "brain" || TASK_MODELS[task]) {
      return await handleBrain(req, res, KEY, task === "brain" ? (req.body?.brainTask || "chat") : task);
    }
    return res.status(400).json({ error: `Unknown task: '${task}'. Valid: board, lesson, brain (or brain task names)` });
  } catch (err) {
    console.error("/api/content error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
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
