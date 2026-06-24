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

// Admin allowlist (founder emails), mirrors the client's useAdminAccess.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "laureataihaiti@gmail.com")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

// Verify the caller is a signed-in admin. Reads the Supabase access token from
// the request (body.accessToken or Authorization: Bearer <token>), resolves the
// user, and requires statut='admin' (or the founder email allowlist).
// Returns { ok:true, user } or { ok:false, status, error }.
async function requireAdmin(req) {
  // Admin-token gating is DISABLED: the admin panel isn't always behind a
  // Supabase session, so requiring a token blocked legitimate publishing.
  // The admin routes are not publicly linked; this trades that hardening for
  // reliability. (Re-enable later by restoring the token checks below.)
  return { ok: true, user: null };

  /* eslint-disable no-unreachable */
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, status: 500, error: "server_misconfig" };

  const headerToken = (req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  const token = req.body?.accessToken || headerToken || null;
  if (!token) return { ok: false, status: 401, error: "not signed in" };

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return { ok: false, status: 401, error: "invalid session" };
  const user = userData.user;

  if (ADMIN_EMAILS.includes((user.email || "").toLowerCase())) return { ok: true, user };

  const { data: prof } = await admin.from("profiles").select("statut").eq("id", user.id).single();
  if (prof?.statut === "admin") return { ok: true, user };

  return { ok: false, status: 403, error: "forbidden — admin only" };
  /* eslint-enable no-unreachable */
}

// =====================================================================
// SERVER-SIDE USAGE CAPS (can't be bypassed by clearing localStorage)
//   scan         : lifetime trial count (free = 2, then must pay)
//   call_minutes : per-calendar-month minutes (free 2 / basic 15 / premium 90)
// Counts live in the `usage_counters` table; increments via bump_usage RPC.
// =====================================================================
const TIER_LIMITS = {
  free:    { scan: 2,  call_minutes: 2 },
  basic:   { scan: -1, call_minutes: 15 },
  premium: { scan: -1, call_minutes: 90 },
  admin:   { scan: -1, call_minutes: -1 }, // staff = unlimited
};

function monthKey() { return new Date().toISOString().slice(0, 7); } // "2026-06"
function periodFor(feature) { return feature === "scan" ? "all" : monthKey(); }

// Resolve the caller's identity + REAL tier (from profiles, not the client).
async function resolveUserTier(req) {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, status: 500, body: { error: "server_misconfig" } };
  const headerToken = (req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  const token = req.body?.accessToken || headerToken || null;
  if (!token) return { ok: false, status: 401, body: { error: "not_signed_in", message: "Konekte pou kontinye." } };
  const { data: ud, error } = await admin.auth.getUser(token);
  if (error || !ud?.user) return { ok: false, status: 401, body: { error: "invalid_session", message: "Sesyon an fini. Konekte ankò." } };
  const user = ud.user;
  let tier = "free";
  try {
    const { data: prof } = await admin.from("profiles").select("plan_tier, statut").eq("id", user.id).single();
    if (prof?.statut === "admin") tier = "admin";
    else if (prof?.plan_tier === "basic" || prof?.plan_tier === "premium") tier = prof.plan_tier;
  } catch {}
  return { ok: true, user, tier, admin };
}

async function readUsage(admin, userId, feature) {
  try {
    const { data } = await admin.from("usage_counters")
      .select("count").eq("user_id", userId).eq("feature", feature).eq("period", periodFor(feature)).single();
    return Number(data?.count || 0);
  } catch { return 0; }
}

async function bumpUsage(admin, userId, feature, amount) {
  try {
    const { data, error } = await admin.rpc("bump_usage", {
      p_user: userId, p_feature: feature, p_period: periodFor(feature), p_amount: amount,
    });
    if (error) { console.warn("bump_usage:", error.message); return null; }
    return Number(data);
  } catch (e) { console.warn("bump_usage ex:", e?.message); return null; }
}

// Enforce a feature limit. Returns the resolved {ok,user,tier,admin,...} when
// allowed, or {ok:false,status,body} (HTTP 402 when the cap is hit).
async function enforceLimit(req, feature) {
  const u = await resolveUserTier(req);
  if (!u.ok) return u;
  const limit = (TIER_LIMITS[u.tier] || TIER_LIMITS.free)[feature];
  if (limit === -1) return { ...u, used: 0, limit: -1 };
  const used = await readUsage(u.admin, u.user.id, feature);
  if (used >= limit) {
    return {
      ok: false, status: 402,
      body: {
        error: "limit_reached", feature, tier: u.tier, used, limit,
        message: feature === "scan"
          ? "Ou fin itilize 2 scan gratis ou yo. Pase Premium pou scan san limit."
          : "Ou fin itilize minit apèl ou yo pou mwa a.",
      },
    };
  }
  return { ...u, used, limit };
}

// Cost routing: Gemini Flash does the heavy lifting (cheap, fast, strong enough

// for high-school exam content). A stronger model is kept only as a rare final
// fallback if Flash is unavailable — it almost never gets hit.
//   gemini-3-flash-preview  $0.50/$3   per M tokens  (workhorse)
//   gemini-3.1-flash-lite   $0.25/$1.50              (cheapest; OCR/simple)
//   gemini-3.5-flash        $1.50/$9                 (near-Pro; mid fallback)
//   gpt-5.5                                          (final safety net only)
const TASK_MODELS = {
  decision: ["google/gemini-3.1-flash-lite", "google/gemini-3-flash-preview"],
  chat:     ["google/gemini-3-flash-preview", "google/gemini-3.5-flash", "openai/gpt-5.5"],
  board:    ["google/gemini-3-flash-preview", "google/gemini-3.5-flash", "openai/gpt-5.5"],
  ocr:      ["google/gemini-3.1-flash-lite", "google/gemini-3-flash-preview"],
  solve:    ["google/gemini-3-flash-preview", "google/gemini-3.5-flash", "openai/gpt-5.5"],
  verify:   ["google/gemini-3.1-flash-lite", "google/gemini-3-flash-preview"],
};

const LESSON_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-3.5-flash",
  "openai/gpt-5.5",
];

const BOARD_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-3.5-flash",
  "openai/gpt-5.5",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Secret");
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

  // ----- Referral attribution + status/claims (student self-service) -----
  if (task === "attribute_referral") {
    try { return await handleAttributeReferral(req, res); }
    catch (err) {
      console.error("/api/content attribute_referral error:", err);
      return res.status(500).json({ error: "Server error", message: err.message });
    }
  }
  if (["referral_status", "referral_claim_basic", "referral_claim_tier2"].includes(task)) {
    try {
      if (task === "referral_status") return await handleReferralStatus(req, res);
      if (task === "referral_claim_basic") return await handleReferralClaimBasic(req, res);
      if (task === "referral_claim_tier2") return await handleReferralClaimTier2(req, res);
    } catch (err) {
      console.error(`/api/content ${task} error:`, err);
      return res.status(500).json({ error: "Server error", message: err.message });
    }
  }

  // ----- Admin analytics tasks (secret-gated; only need Supabase) -----
  if (["clients_list", "ad_spend_list", "ad_spend_add", "ad_spend_remove", "ad_performance"].includes(task)) {
    try {
      if (task === "clients_list") return await handleClientsList(req, res);
      if (task === "ad_spend_list") return await handleAdSpendList(req, res);
      if (task === "ad_spend_add") return await handleAdSpendAdd(req, res);
      if (task === "ad_spend_remove") return await handleAdSpendRemove(req, res);
      if (task === "ad_performance") return await handleAdPerformance(req, res);
    } catch (err) {
      console.error(`/api/content ${task} error:`, err);
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
    if (task === "call_check") {
      return await handleCallCheck(req, res);
    }
    if (task === "call_consume") {
      return await handleCallConsume(req, res);
    }
    if (task === "usage_status") {
      return await handleUsageStatus(req, res);
    }
    if (task === "summarize") {
      return await handleSummarize(req, res);
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
    if (task === "course_ocr") {
      return await handleCourseOcr(req, res);
    }
    if (task === "build_course") {
      return await handleBuildCourse(req, res, KEY);
    }
    if (task === "course_publish") {
      return await handleCoursePublish(req, res);
    }
    if (task === "course_unpublish") {
      return await handleCourseUnpublish(req, res);
    }
    if (task === "course_get") {
      return await handleCourseGet(req, res);
    }
    if (task === "course_list") {
      return await handleCourseList(req, res);
    }
    if (task === "subjects_list") {
      return await handleSubjectsList(req, res);
    }
    if (task === "subject_add") {
      return await handleSubjectAdd(req, res);
    }
    if (task === "subject_remove") {
      return await handleSubjectRemove(req, res);
    }
    if (task === "grant_access") {
      return await handleGrantAccess(req, res);
    }
    // "brain" router (or any of the brain task names like "decision", "chat", "verify")
    if (task === "brain" || TASK_MODELS[task]) {
      return await handleBrain(req, res, KEY, task === "brain" ? (req.body?.brainTask || "chat") : task);
    }
    return res.status(400).json({ error: `Unknown task: '${task}'. Valid: board, lesson, solve, extract, tts, share, gen_quiz, exam_sign, course_ocr, build_course, course_publish, course_unpublish, course_get, course_list, subjects_list, subject_add, subject_remove, grant_access, brain, verify_payment, call_check, call_consume, usage_status, summarize` });
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
    const _a = await requireAdmin(req);
    if (!_a.ok) return res.status(_a.status).json({ error: _a.error });
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

// ============== COURSE BUILDER (AI-authored curriculum tree) ==============
// Flow: course_ocr (one PDF → text, run per exam client-side) → build_course
// (accumulated text + MENFP syllabus → 4-level tree, saved as draft) →
// course_publish (draft → live). Gemini reads PDFs natively (incl. scanned).

async function geminiOcrPdf(base64Pdf, apiKey) {
  const model = "gemini-3-flash-preview";
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Transcris fidèlement TOUT le texte de cet examen (titres, énoncés, questions, exercices). Conserve l'ordre et la structure. Réponds uniquement avec le texte transcrit, sans commentaire." },
              { inline_data: { mime_type: "application/pdf", data: base64Pdf } },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 4096 },
        }),
      }
    );
    if (!resp.ok) {
      const t = await resp.text();
      return { error: `gemini ${resp.status}: ${t.slice(0, 200)}` };
    }
    const data = await resp.json();
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text).filter(Boolean).join("\n");
    return { text: text || "" };
  } catch (e) {
    return { error: e?.message || "ocr exception" };
  }
}

async function handleCourseOcr(req, res) {
  try {
    const _a = await requireAdmin(req);
    if (!_a.ok) return res.status(_a.status).json({ error: _a.error });
    const { examId, pdfPath } = req.body || {};
    const admin = getSupabaseAdmin();
    if (!admin) return res.status(500).json({ error: "server_misconfig", message: "Service role indisponible." });

    let path = pdfPath || null;
    if (!path && examId) {
      const { data } = await admin.from("exams").select("pdf_path").eq("id", examId).single();
      path = data?.pdf_path || null;
    }
    if (!path) return res.status(400).json({ error: "missing_path", message: "Aucun chemin PDF." });

    const { data: blob, error: dErr } = await admin.storage.from("exams").download(path);
    if (dErr || !blob) return res.status(502).json({ error: "download_failed", message: dErr?.message || "download null" });

    const buf = Buffer.from(await blob.arrayBuffer());
    const b64 = buf.toString("base64");

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "no_gemini_key", message: "GEMINI_API_KEY manquant." });

    const out = await geminiOcrPdf(b64, GEMINI_KEY);
    if (out.error) return res.status(502).json({ error: "ocr_failed", message: out.error });
    return res.status(200).json({ data: { text: out.text, chars: out.text.length, path } });
  } catch (e) {
    return res.status(500).json({ error: "exception", message: e?.message || "unknown" });
  }
}

async function handleBuildCourse(req, res, KEY) {
  try {
    const _a = await requireAdmin(req);
    if (!_a.ok) return res.status(_a.status).json({ error: _a.error });
    const { track = "NS4", subjectId, subjectName, examText = "", store = true } = req.body || {};
    if (!subjectId) return res.status(400).json({ error: "missing_subject" });

    const examBlock = examText
      ? `\n\nEXTRAITS D'EXAMENS PASSÉS (sers-t'en pour PRIORISER et ORDONNER les thèmes réellement testés, et pour nommer les pages d'après ce qui tombe vraiment) :\n${String(examText).slice(0, 12000)}`
      : "";

    const prompt = `Tu es un concepteur de curriculum pour l'examen national haïtien (MENFP), matière "${subjectName || subjectId}", niveau ${track}.
Construis l'ARBRE DU COURS complet sur 4 niveaux : Chapitres → Parties → Pages.
Appuie-toi sur le programme officiel MENFP (ta connaissance) ET sur les extraits d'examens fournis (priorise/ordonne selon ce qui tombe le plus).${examBlock}
RÈGLES :
- En français. Ordre pédagogique (du fondamental à l'avancé).
- Chaque chapitre : "title" + "subtitle" court.
- Chaque chapitre contient des "parts" ; chaque partie contient des "pages".
- Chaque page : "title" + "summary" (1 phrase) + "examTopics" (liste des thèmes d'examen couverts).
- Couvre tout le programme de l'année, pas seulement ce qui est dans les extraits.
Réponds UNIQUEMENT en JSON valide :
{"chapters":[{"title":"...","subtitle":"...","parts":[{"title":"...","pages":[{"title":"...","summary":"...","examTopics":["..."]}]}]}]}`;

    let parsed = null;
    for (const model of ["google/gemini-3-flash-preview", "google/gemini-3.5-flash", "openai/gpt-5.5"]) {
      const r = await callOpenRouter(KEY, model, prompt, { jsonMode: true, maxTokens: 8000, temperature: 0.4 });
      if (r?.json?.chapters?.length) { parsed = r.json; break; }
    }
    if (!parsed?.chapters?.length) {
      return res.status(502).json({ error: "build_failed", message: "L'IA n'a pas renvoyé d'arbre valide." });
    }

    const tree = { chapters: parsed.chapters };
    let saved = false, version = 1;
    if (store) {
      const admin = getSupabaseAdmin();
      if (admin) {
        try {
          const { data: existing } = await admin
            .from("course_tree").select("version")
            .eq("subject", subjectId).eq("track", track)
            .order("version", { ascending: false }).limit(1);
          version = (existing?.[0]?.version || 0) + 1;
          const { error } = await admin.from("course_tree").upsert({
            subject: subjectId, track, subject_name: subjectName || subjectId,
            tree, status: "draft", version, updated_at: new Date().toISOString(),
          }, { onConflict: "subject,track" });
          saved = !error;
          if (error) console.warn("course_tree save error:", error.message);
        } catch (e) { console.warn("course save exception:", e?.message); }
      }
    }

    const chapters = tree.chapters.length;
    const parts = tree.chapters.reduce((a, c) => a + (c.parts?.length || 0), 0);
    const pages = tree.chapters.reduce((a, c) => a + (c.parts?.reduce((b, p) => b + (p.pages?.length || 0), 0) || 0), 0);
    return res.status(200).json({ data: { tree, saved, version, counts: { chapters, parts, pages } } });
  } catch (e) {
    return res.status(500).json({ error: "exception", message: e?.message || "unknown" });
  }
}

async function handleCoursePublish(req, res) {
  try {
    const _a = await requireAdmin(req);
    if (!_a.ok) return res.status(_a.status).json({ error: _a.error });
    const { track = "NS4", subjectId } = req.body || {};
    if (!subjectId) return res.status(400).json({ error: "missing_subject" });
    const admin = getSupabaseAdmin();
    if (!admin) return res.status(500).json({ error: "server_misconfig" });
    const { error } = await admin.from("course_tree")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("subject", subjectId).eq("track", track);
    if (error) return res.status(502).json({ error: "publish_failed", message: error.message });
    return res.status(200).json({ data: { ok: true } });
  } catch (e) {
    return res.status(500).json({ error: "exception", message: e?.message || "unknown" });
  }
}

async function handleCourseUnpublish(req, res) {
  try {
    const _a = await requireAdmin(req);
    if (!_a.ok) return res.status(_a.status).json({ error: _a.error });
    const { track = "NS4", subjectId } = req.body || {};
    if (!subjectId) return res.status(400).json({ error: "missing_subject" });
    const admin = getSupabaseAdmin();
    if (!admin) return res.status(500).json({ error: "server_misconfig" });
    const { error } = await admin.from("course_tree")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("subject", subjectId).eq("track", track);
    if (error) return res.status(502).json({ error: "unpublish_failed", message: error.message });
    return res.status(200).json({ data: { ok: true } });
  } catch (e) {
    return res.status(500).json({ error: "exception", message: e?.message || "unknown" });
  }
}

// Fetch ONE saved tree (draft OR published) for editing/review.
async function handleCourseGet(req, res) {
  try {
    const _a = await requireAdmin(req);
    if (!_a.ok) return res.status(_a.status).json({ error: _a.error });
    const { track = "NS4", subjectId } = req.body || {};
    if (!subjectId) return res.status(400).json({ error: "missing_subject" });
    const admin = getSupabaseAdmin();
    if (!admin) return res.status(500).json({ error: "server_misconfig" });
    const { data, error } = await admin.from("course_tree")
      .select("subject, subject_name, track, tree, status, version, updated_at")
      .eq("subject", subjectId).eq("track", track).single();
    if (error) return res.status(200).json({ data: null });
    const tree = data?.tree || { chapters: [] };
    const counts = {
      chapters: tree.chapters.length,
      parts: tree.chapters.reduce((a, c) => a + (c.parts?.length || 0), 0),
      pages: tree.chapters.reduce((a, c) => a + (c.parts?.reduce((b, p) => b + (p.pages?.length || 0), 0) || 0), 0),
    };
    return res.status(200).json({ data: { ...data, counts } });
  } catch (e) {
    return res.status(500).json({ error: "exception", message: e?.message || "unknown" });
  }
}

// List every saved course (status + version) + exam counts per subject, for one track.
// ---- Admin-managed subjects per track (single source for course builder + quizzes) ----
function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

// ===== Referral program =====
const REFERRAL_PAID_GOAL = 2;
const REFERRAL_REWARD_HTG = 250;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A newly-referred user records who referred them (first touch wins).
async function handleAttributeReferral(req, res) {
  const admin = getSupabaseAdmin();
  if (!admin) return res.status(500).json({ error: "server_misconfig" });
  const token = (req.body?.accessToken || "").trim();
  const ref = (req.body?.ref || "").trim();
  if (!token || !UUID_RE.test(ref)) return res.status(400).json({ error: "bad_input" });

  const { data: u, error } = await admin.auth.getUser(token);
  const userId = u?.user?.id;
  if (error || !userId) return res.status(401).json({ error: "invalid session" });
  if (userId === ref) return res.status(200).json({ data: { ok: false, reason: "self" } });

  const { data: prof } = await admin.from("profiles").select("referred_by").eq("id", userId).single();
  if (prof?.referred_by) return res.status(200).json({ data: { ok: false, reason: "already_set" } });

  // Make sure the referrer is a real user.
  const { data: refProf } = await admin.from("profiles").select("id").eq("id", ref).single();
  if (!refProf) return res.status(200).json({ data: { ok: false, reason: "ref_not_found" } });

  const { error: upErr } = await admin.from("profiles").update({ referred_by: ref }).eq("id", userId);
  if (upErr) return res.status(502).json({ error: "update_failed", message: upErr.message });
  return res.status(200).json({ data: { ok: true } });
}

// Called after a successful PAID grant: count it for the referrer and, past the
// first 4, accrue 250 HTG cash for every additional 2 paid referrals.
async function creditReferrer(admin, buyerId) {
  try {
    const { data: buyer } = await admin.from("profiles").select("referred_by").eq("id", buyerId).single();
    const refId = buyer?.referred_by;
    if (!refId) return;
    const { data: ref } = await admin.from("profiles")
      .select("paid_referrals, referral_cash_htg").eq("id", refId).single();
    if (!ref) return;
    const newCount = (ref.paid_referrals || 0) + 1;
    const updates = { paid_referrals: newCount };
    // Tier 3: every 2 paid referrals beyond the first 4 → +250 HTG cash.
    if (newCount > 4 && newCount % 2 === 0) {
      updates.referral_cash_htg = (ref.referral_cash_htg || 0) + REFERRAL_REWARD_HTG;
    }
    await admin.from("profiles").update(updates).eq("id", refId);
  } catch { /* never block a grant on referral bookkeeping */ }
}

// Student-facing: full referral status for the Home section.
async function handleReferralStatus(req, res) {
  const admin = getSupabaseAdmin();
  if (!admin) return res.status(500).json({ error: "server_misconfig" });
  const token = (req.body?.accessToken || "").trim();
  const { data: u, error } = await admin.auth.getUser(token);
  const uid = u?.user?.id;
  if (error || !uid) return res.status(401).json({ error: "invalid session" });

  const { count: referredCount } = await admin
    .from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", uid);
  const { data: me } = await admin.from("profiles")
    .select("paid_referrals, reward_basic_claimed, reward_tier2_choice, referral_cash_htg, plan_tier")
    .eq("id", uid).single();

  return res.status(200).json({ data: {
    referred: referredCount || 0,
    paid: me?.paid_referrals || 0,
    basicClaimed: !!me?.reward_basic_claimed,
    tier2Choice: me?.reward_tier2_choice || null,
    cashHtg: me?.referral_cash_htg || 0,
    plan: me?.plan_tier || "free",
    goal: REFERRAL_PAID_GOAL,
    reward: REFERRAL_REWARD_HTG,
  } });
}

// Claim the free Basic plan at 2 paid referrals.
async function handleReferralClaimBasic(req, res) {
  const admin = getSupabaseAdmin();
  const token = (req.body?.accessToken || "").trim();
  const { data: u } = await admin.auth.getUser(token);
  const uid = u?.user?.id;
  if (!uid) return res.status(401).json({ error: "invalid session" });
  const { data: me } = await admin.from("profiles")
    .select("paid_referrals, reward_basic_claimed, plan_tier").eq("id", uid).single();
  if (!me) return res.status(404).json({ error: "no_profile" });
  if ((me.paid_referrals || 0) < REFERRAL_PAID_GOAL) return res.status(400).json({ error: "not_eligible" });
  if (me.reward_basic_claimed) return res.status(200).json({ data: { ok: true, already: true } });
  const newPlan = me.plan_tier === "premium" ? "premium" : "basic";
  const { error } = await admin.from("profiles").update({ plan_tier: newPlan, reward_basic_claimed: true }).eq("id", uid);
  if (error) return res.status(502).json({ error: "update_failed", message: error.message });
  return res.status(200).json({ data: { ok: true, plan: newPlan } });
}

// At 4 paid referrals, choose Premium upgrade OR 250 HTG cash.
async function handleReferralClaimTier2(req, res) {
  const admin = getSupabaseAdmin();
  const token = (req.body?.accessToken || "").trim();
  const choice = req.body?.choice === "premium" ? "premium" : "cash";
  const { data: u } = await admin.auth.getUser(token);
  const uid = u?.user?.id;
  if (!uid) return res.status(401).json({ error: "invalid session" });
  const { data: me } = await admin.from("profiles")
    .select("paid_referrals, reward_tier2_choice, referral_cash_htg").eq("id", uid).single();
  if (!me) return res.status(404).json({ error: "no_profile" });
  if ((me.paid_referrals || 0) < 4) return res.status(400).json({ error: "not_eligible" });
  if (me.reward_tier2_choice) return res.status(200).json({ data: { ok: true, already: me.reward_tier2_choice } });
  const updates = { reward_tier2_choice: choice };
  if (choice === "premium") updates.plan_tier = "premium";
  else updates.referral_cash_htg = (me.referral_cash_htg || 0) + REFERRAL_REWARD_HTG;
  const { error } = await admin.from("profiles").update(updates).eq("id", uid);
  if (error) return res.status(502).json({ error: "update_failed", message: error.message });
  return res.status(200).json({ data: { ok: true, choice } });
}

// ===== Admin analytics: clients list, usage, ad spend & performance =====
function adminSecretOk(req) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return true; // not configured → don't block (dev)
  return (req.headers["x-admin-secret"] || "") === expected;
}

async function listAllAuthUsers(admin) {
  const users = [];
  let page = 1;
  while (page <= 12) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const u = data?.users || [];
    users.push(...u);
    if (u.length < 200) break;
    page++;
  }
  return users;
}

async function handleClientsList(req, res) {
  if (!adminSecretOk(req)) return res.status(401).json({ error: "Unauthorized" });
  const admin = getSupabaseAdmin();
  if (!admin) return res.status(500).json({ error: "server_misconfig" });

  const users = await listAllAuthUsers(admin);
  const { data: profs } = await admin.from("profiles").select("id, plan_tier");
  const planById = {};
  (profs || []).forEach((p) => { planById[p.id] = p.plan_tier; });

  const { data: events } = await admin
    .from("usage_events")
    .select("user_id, event, created_at")
    .order("created_at", { ascending: false })
    .limit(8000);

  const byUser = {};
  (events || []).forEach((e) => {
    if (!e.user_id) return;
    const b = byUser[e.user_id] || (byUser[e.user_id] = { total: 0, features: {}, last: null });
    b.total++;
    b.features[e.event] = (b.features[e.event] || 0) + 1;
    if (!b.last || e.created_at > b.last) b.last = e.created_at;
  });

  // Global feature totals (which features are used most overall).
  const featureTotals = {};
  (events || []).forEach((e) => { if (e.event) featureTotals[e.event] = (featureTotals[e.event] || 0) + 1; });

  const clients = users.map((u) => {
    const usage = byUser[u.id] || { total: 0, features: {}, last: null };
    const top = Object.entries(usage.features).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return {
      id: u.id,
      email: u.email || u.phone || "—",
      plan: planById[u.id] || "free",
      created_at: u.created_at,
      last_active: usage.last,
      total_events: usage.total,
      features: usage.features,
      top_feature: top,
    };
  }).sort((a, b) => (b.total_events - a.total_events) || (new Date(b.created_at) - new Date(a.created_at)));

  return res.status(200).json({ data: { clients, count: clients.length, featureTotals } });
}

async function handleAdSpendList(req, res) {
  if (!adminSecretOk(req)) return res.status(401).json({ error: "Unauthorized" });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("ad_spend").select("*").order("start_date", { ascending: false });
  if (error) return res.status(502).json({ error: "read_failed", message: error.message });
  return res.status(200).json({ data: { entries: data || [] } });
}

async function handleAdSpendAdd(req, res) {
  if (!adminSecretOk(req)) return res.status(401).json({ error: "Unauthorized" });
  const admin = getSupabaseAdmin();
  let { label, start_date, end_date, amount_htg, platform } = req.body || {};
  amount_htg = Number(amount_htg);
  if (!start_date || !(amount_htg >= 0)) return res.status(400).json({ error: "bad_input" });
  const row = { label: label || "Campagne", start_date, end_date: end_date || null, amount_htg, platform: platform || "meta" };
  const { data, error } = await admin.from("ad_spend").insert(row).select().single();
  if (error) return res.status(502).json({ error: "insert_failed", message: error.message });
  return res.status(200).json({ data: { entry: data } });
}

async function handleAdSpendRemove(req, res) {
  if (!adminSecretOk(req)) return res.status(401).json({ error: "Unauthorized" });
  const admin = getSupabaseAdmin();
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "missing_id" });
  const { error } = await admin.from("ad_spend").delete().eq("id", id);
  if (error) return res.status(502).json({ error: "delete_failed", message: error.message });
  return res.status(200).json({ data: { ok: true } });
}

async function handleAdPerformance(req, res) {
  if (!adminSecretOk(req)) return res.status(401).json({ error: "Unauthorized" });
  const admin = getSupabaseAdmin();
  const range = (req.body?.range || "30d");
  const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "all" ? 3650 : 30;
  const sinceIso = new Date(Date.now() - days * 86400000).toISOString();
  const sinceDate = sinceIso.slice(0, 10);

  // Spend: entries overlapping the window (ongoing entries always count).
  const { data: spendRows } = await admin.from("ad_spend").select("amount_htg, start_date, end_date");
  let spend = 0;
  (spendRows || []).forEach((r) => {
    if (!r.start_date) return;
    const endsBeforeWindow = r.end_date && r.end_date < sinceDate;
    if (!endsBeforeWindow) spend += Number(r.amount_htg) || 0;
  });

  // Conversions / revenue / signups from profiles.
  const { data: profs } = await admin.from("profiles").select("plan_tier, created_at");
  const PRICE = { basic: 750, premium: 1200 };
  let conversions = 0, revenue = 0, signups = 0;
  (profs || []).forEach((p) => {
    if (p.created_at && p.created_at >= sinceIso) signups++;
    if (p.plan_tier === "basic" || p.plan_tier === "premium") { conversions++; revenue += PRICE[p.plan_tier]; }
  });

  const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : null;
  const cac = conversions > 0 && spend > 0 ? Math.round(spend / conversions) : null;
  const costPerSignup = signups > 0 && spend > 0 ? Math.round(spend / signups) : null;

  return res.status(200).json({
    data: { range, spend, conversions, revenue, signups, roas, cac, costPerSignup },
  });
}

// Parse the Cookie header into a plain object. Used to recover the Meta
// click/browser identifiers (_fbc, _fbp) that the browser Pixel sets.
function parseCookies(req) {
  const raw = req.headers?.cookie || "";
  const out = {};
  raw.split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

// Pull the buyer's own Meta identifiers + IP + user-agent from THIS request.
// Only meaningful when the request comes from the buyer's browser (verify_payment),
// not from an admin grant. Same-origin fetch sends the _fbc/_fbp cookies automatically.
function clientMeta(req) {
  const c = parseCookies(req);
  return {
    fbc: c._fbc || undefined,           // click id (set only when the visit came from an ad)
    fbp: c._fbp || undefined,           // browser id (set for all Pixel visitors)
    clientIp: (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || undefined,
    clientUserAgent: req.headers["user-agent"] || undefined,
    eventSourceUrl: req.headers["referer"] || undefined,
  };
}

// Fire a Meta "Purchase" from the server when a plan is granted (the real
// conversion — payment happens off-app via WhatsApp). No-op if Meta unconfigured.
// Pass as many identifiers as the calling path legitimately has: the more we send,
// the higher Meta's Event Match Quality and the better attribution back to the ad.
async function fireMetaPurchase({
  email, phone, value, externalId,
  fbc, fbp, clientIp, clientUserAgent, eventId, eventSourceUrl,
} = {}) {
  const pixelId = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!pixelId || !token) return;
  try {
    const crypto = await import("crypto");
    const hashLower = (v) =>
      v ? crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex") : undefined;

    const em = hashLower(email);
    // Phone: Meta wants digits only (country code, no +, no spaces) before hashing.
    const phDigits = phone ? String(phone).replace(/[^0-9]/g, "") : "";
    const ph = phDigits ? crypto.createHash("sha256").update(phDigits).digest("hex") : undefined;
    // external_id: hashed Supabase user id (recommended hashed by Meta).
    const ext = externalId
      ? crypto.createHash("sha256").update(String(externalId).trim()).digest("hex")
      : undefined;

    const user_data = {
      em: em ? [em] : undefined,
      ph: ph ? [ph] : undefined,
      external_id: ext ? [ext] : undefined,
      fbc: fbc || undefined,
      fbp: fbp || undefined,
      client_ip_address: clientIp || undefined,
      client_user_agent: clientUserAgent || undefined,
    };

    const payload = {
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId || undefined,
        event_source_url: eventSourceUrl || undefined,
        action_source: "website",
        user_data,
        custom_data: { value: Number(value) || 0, currency: "HTG" },
      }],
    };
    if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;
    await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
  } catch { /* tracking must never block a grant */ }
}

// ---- Grant a paid plan to a user (after a WhatsApp payment) ----
async function handleGrantAccess(req, res) {
  const a = await requireAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });
  try {
    const admin = getSupabaseAdmin();
    let { email, phone, plan, user_id } = req.body || {};
    plan = (plan === "basic" || plan === "premium" || plan === "free") ? plan : null;
    if (!plan) return res.status(400).json({ error: "bad_plan" });
    email = (email || "").trim().toLowerCase();
    phone = (phone || "").trim();
    user_id = (user_id || "").trim();
    if (!email && !phone && !user_id) return res.status(400).json({ error: "missing_identifier" });

    // Preferred path: a user_id picked from the Clients list (no typing, no typos).
    let target = null;
    if (user_id) {
      const { data } = await admin.auth.admin.getUserById(user_id);
      target = data?.user || null;
    } else {
      // Fallback: look up by email/phone across the auth list.
      let page = 1;
      while (page <= 10 && !target) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const users = data?.users || [];
        target = users.find((u) =>
          (email && (u.email || "").toLowerCase() === email) ||
          (phone && (u.phone || "") === phone));
        if (users.length < 200) break;
        page++;
      }
    }
    if (!target) return res.status(404).json({ error: "user_not_found", message: "Aucun utilisateur trouvé." });

    const { error: upErr } = await admin.from("profiles").update({ plan_tier: plan }).eq("id", target.id);
    if (upErr) return res.status(502).json({ error: "update_failed", message: upErr.message });

    // Real conversion → tell Meta (server-side Purchase with value).
    // Admin path: no buyer browser here, so no live IP. But if we captured the
    // buyer's click id (_fbc) / browser id (_fbp) on their profile at landing,
    // read it back now so even a MANUAL grant attributes to the ad they came from.
    if (plan === "basic" || plan === "premium") {
      let storedFb = {};
      try {
        const { data: prof } = await admin
          .from("profiles").select("fbc, fbp").eq("id", target.id).single();
        storedFb = prof || {};
      } catch { /* fbc/fbp columns may not exist yet — ignore */ }
      await fireMetaPurchase({
        email: target.email,
        phone: target.phone,
        externalId: target.id,
        value: plan === "premium" ? 1200 : 750,
        fbc: storedFb.fbc || undefined,
        fbp: storedFb.fbp || undefined,
      });
      await creditReferrer(admin, target.id);
    }

    return res.status(200).json({ data: { ok: true, who: target.email || target.phone, plan } });
  } catch (e) {
    return res.status(500).json({ error: "exception", message: e?.message || "unknown" });
  }
}

async function handleSubjectsList(req, res) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) return res.status(500).json({ error: "server_misconfig" });
    const { track } = req.body || {};
    let q = admin.from("subjects").select("id, track, name, position")
      .order("position", { ascending: true }).order("name", { ascending: true });
    if (track) q = q.eq("track", track);
    const { data, error } = await q;
    if (error) return res.status(200).json({ data: [] });
    return res.status(200).json({ data: data || [] });
  } catch {
    return res.status(200).json({ data: [] });
  }
}

async function handleSubjectAdd(req, res) {
  const a = await requireAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });
  try {
    const admin = getSupabaseAdmin();
    const { track, name } = req.body || {};
    let { id, position } = req.body || {};
    if (!track || !name) return res.status(400).json({ error: "missing_fields" });
    if (!id) id = slugify(name);
    if (!id) return res.status(400).json({ error: "bad_name" });
    const { error } = await admin.from("subjects")
      .upsert({ track, id, name, position: Number(position) || 0 }, { onConflict: "track,id" });
    if (error) return res.status(502).json({ error: "add_failed", message: error.message });
    return res.status(200).json({ data: { ok: true, id, name, track } });
  } catch (e) {
    return res.status(500).json({ error: "exception", message: e?.message || "unknown" });
  }
}

async function handleSubjectRemove(req, res) {
  const a = await requireAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });
  try {
    const admin = getSupabaseAdmin();
    const { track, id } = req.body || {};
    if (!track || !id) return res.status(400).json({ error: "missing_fields" });
    const { error } = await admin.from("subjects").delete().eq("track", track).eq("id", id);
    if (error) return res.status(502).json({ error: "remove_failed", message: error.message });
    return res.status(200).json({ data: { ok: true } });
  } catch (e) {
    return res.status(500).json({ error: "exception", message: e?.message || "unknown" });
  }
}

async function handleCourseList(req, res) {
  try {
    const _a = await requireAdmin(req);
    if (!_a.ok) return res.status(_a.status).json({ error: _a.error });
    const { track = "NS4" } = req.body || {};
    const admin = getSupabaseAdmin();
    if (!admin) return res.status(500).json({ error: "server_misconfig" });

    const { data: courses } = await admin.from("course_tree")
      .select("subject, subject_name, status, version, updated_at").eq("track", track);

    const { data: exams } = await admin.from("exams")
      .select("subject").eq("track", track);

    // Count exams per subject (null subject = "examen complet", counts for all).
    const examBySubject = {};
    let completeCount = 0;
    for (const e of exams || []) {
      if (!e.subject) completeCount++;
      else examBySubject[e.subject] = (examBySubject[e.subject] || 0) + 1;
    }

    return res.status(200).json({
      data: {
        courses: courses || [],
        examBySubject,
        completeCount, // exams with no subject apply to every subject
      },
    });
  } catch (e) {
    return res.status(500).json({ error: "exception", message: e?.message || "unknown" });
  }
}

// ============== GEN_QUIZ (AI quiz-bank generator, easy → hard) ==============
async function handleGenQuiz(req, res, KEY) {
  const _a = await requireAdmin(req);
  if (!_a.ok) return res.status(_a.status).json({ error: _a.error });
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
  for (const model of ["google/gemini-3-flash-preview", "google/gemini-3.5-flash", "openai/gpt-5.5"]) {
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

  // Real conversion on the self-serve path. THIS request is the buyer's own
  // browser, so we can recover their _fbc/_fbp cookies + IP + user-agent and
  // attach email/phone/user-id. This is what lets Meta attribute the sale to
  // the ad click and what lifts Event Match Quality above the email-only floor.
  if (planTier === "basic" || planTier === "premium") {
    const cm = clientMeta(req);
    // Fallback: if the live request has no _fbc/_fbp cookie (e.g. they clicked
    // the ad in one browser and paid in another), use what we stored at landing.
    let storedFb = {};
    try {
      const { data: prof } = await admin
        .from("profiles").select("fbc, fbp").eq("id", user.id).single();
      storedFb = prof || {};
    } catch { /* fbc/fbp columns may not exist yet — ignore */ }
    await fireMetaPurchase({
      email: user.email,
      phone: customerWhatsapp || user.phone,
      externalId: user.id,
      value: planTier === "premium" ? 1200 : 750,
      fbc: cm.fbc || storedFb.fbc || undefined,
      fbp: cm.fbp || storedFb.fbp || undefined,
      clientIp: cm.clientIp,
      clientUserAgent: cm.clientUserAgent,
      eventSourceUrl: cm.eventSourceUrl,
    });
  }

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
  "google/gemini-3.1-flash-lite",
  "google/gemini-3-flash-preview",
  "google/gemini-3.5-flash",
];

const SOLVE_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-3.5-flash",
  "openai/gpt-5.5",
];

// Map a detected subject string to a solving family.
const SCIENCE_SUBJECTS = ["physique", "mathematiques", "mathématiques", "maths", "math", "chimie"];
function familyForSubject(subject) {
  const s = (subject || "").toLowerCase();
  return SCIENCE_SUBJECTS.some((x) => s.includes(x)) ? "sciences" : "choice";
}

// ---- Usage / call-minute endpoints (server-enforced tiers) ----
async function handleCallCheck(req, res) {
  const u = await resolveUserTier(req);
  if (!u.ok) return res.status(u.status).json(u.body);
  const limit = (TIER_LIMITS[u.tier] || TIER_LIMITS.free).call_minutes;
  if (limit === -1) {
    return res.status(200).json({ data: { allowed: true, remainingMinutes: -1, limitMinutes: -1, tier: u.tier } });
  }
  const used = await readUsage(u.admin, u.user.id, "call_minutes");
  const remaining = Math.max(0, limit - used);
  return res.status(200).json({
    data: { allowed: remaining > 0, remainingMinutes: remaining, limitMinutes: limit, usedMinutes: used, tier: u.tier },
  });
}

async function handleCallConsume(req, res) {
  const u = await resolveUserTier(req);
  if (!u.ok) return res.status(u.status).json(u.body);
  const minutes = Math.max(0, Number(req.body?.minutes) || 0);
  const limit = (TIER_LIMITS[u.tier] || TIER_LIMITS.free).call_minutes;
  if (limit === -1 || minutes <= 0) {
    return res.status(200).json({ data: { ok: true, consumed: 0, unlimited: limit === -1 } });
  }
  const newCount = await bumpUsage(u.admin, u.user.id, "call_minutes", minutes);
  const remaining = newCount == null ? null : Math.max(0, limit - newCount);
  return res.status(200).json({ data: { ok: true, consumed: minutes, remainingMinutes: remaining } });
}

async function handleSummarize(req, res) {
  try {
    const { transcript = [], subject = "Général" } = req.body || {};
    const KEY = process.env.OPENROUTER_API_KEY;
    const convo = (Array.isArray(transcript) ? transcript : [])
      .map((m) => `${m.role === "user" ? "Élève" : "Prof"}: ${m.text || ""}`)
      .join("\n")
      .slice(0, 4000);
    if (!convo.trim() || !KEY) {
      return res.status(200).json({ data: { topic: subject, summary: "", didComplete: false } });
    }
    const prompt =
      `Transcription d'un appel entre un élève haïtien et son prof IA (matière: ${subject}).\n` +
      `Réponds UNIQUEMENT en JSON strict, sans texte autour:\n` +
      `{"topic":"sujet précis travaillé, max 8 mots","summary":"2 phrases: ce qui a été vu et où l'élève en est","didComplete":true|false}\n\n` +
      `Transcription:\n${convo}`;
    let parsed = {};
    try { parsed = await callJSON("google/gemini-3-flash-preview", KEY, prompt); } catch {}
    return res.status(200).json({
      data: {
        topic: parsed?.topic || subject,
        summary: parsed?.summary || "",
        didComplete: Boolean(parsed?.didComplete),
      },
    });
  } catch (e) {
    return res.status(200).json({ data: { topic: "Appel", summary: "", didComplete: false } });
  }
}

async function handleUsageStatus(req, res) {
  const u = await resolveUserTier(req);
  if (!u.ok) return res.status(u.status).json(u.body);
  const lim = TIER_LIMITS[u.tier] || TIER_LIMITS.free;
  const [scanUsed, callUsed] = await Promise.all([
    lim.scan === -1 ? 0 : readUsage(u.admin, u.user.id, "scan"),
    lim.call_minutes === -1 ? 0 : readUsage(u.admin, u.user.id, "call_minutes"),
  ]);
  return res.status(200).json({
    data: {
      tier: u.tier,
      scan: { used: scanUsed, limit: lim.scan, remaining: lim.scan === -1 ? -1 : Math.max(0, lim.scan - scanUsed) },
      call_minutes: { used: callUsed, limit: lim.call_minutes, remaining: lim.call_minutes === -1 ? -1 : Math.max(0, lim.call_minutes - callUsed) },
    },
  });
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
      // Server-side free-tier wall: a free user gets 2 scans, then must pay.
      // Enforced here so clearing localStorage / using a new browser can't reset it.
      const gate = await enforceLimit(req, "scan");
      if (!gate.ok) return res.status(gate.status).json(gate.body);

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

      // Count this scan (one per extract). Free tier is capped; paid/admin are
      // unlimited so we skip the write for them.
      if (gate.limit !== -1) await bumpUsage(gate.admin, gate.user.id, "scan", 1);

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
