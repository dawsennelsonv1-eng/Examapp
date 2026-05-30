// api/lesson.js v21
// Generates rich lesson content for a specific event/point in the curriculum.
// Returns: title, intro, sections (with explanations), keyTakeaways, miniQuiz (5 Q's).
// Cached client-side by eventId so we don't burn tokens on every visit.

const MODELS = [
  "anthropic/claude-opus-4.7",
  "google/gemini-3-pro-preview",
  "openai/gpt-5.5",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { subject, chapter, event, track = "NS4", language = "fr" } = req.body || {};
    if (!event?.title) return res.status(400).json({ error: "Missing event info" });

    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    const prompt = buildPrompt({ subject, chapter, event, track, language });

    let lesson = null;
    let modelUsed = null;
    let lastError = null;

    for (const model of MODELS) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${KEY}`,
            "HTTP-Referer": "https://laureatai.com",
            "X-Title": "Laureat AI Lesson",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            max_tokens: 3500,
            temperature: 0.3,
          }),
        });
        if (!response.ok) {
          lastError = `${model}: HTTP ${response.status}`;
          continue;
        }
        const data = await response.json();
        const raw = data?.choices?.[0]?.message?.content;
        if (!raw) continue;
        try {
          const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
          lesson = JSON.parse(cleaned);
          modelUsed = model;
          break;
        } catch {
          lastError = `${model}: JSON parse failed`;
          continue;
        }
      } catch (err) {
        lastError = `${model}: ${err.message}`;
      }
    }

    if (!lesson) {
      return res.status(502).json({ error: "Failed to generate lesson", lastError });
    }

    // Sanitize miniQuiz
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

    return res.status(200).json({
      data: { ...lesson, modelUsed },
    });
  } catch (err) {
    console.error("/api/lesson error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

function buildPrompt({ subject, chapter, event, track, language }) {
  const langInstr = language === "fr"
    ? "Réponds en français uniquement."
    : "Mélange français et kreyòl naturellement.";

  return `Tu es un professeur haïtien expérimenté qui prépare des élèves au niveau ${track} pour leur examen national.
${langInstr}

Crée une leçon détaillée et pédagogique pour:
- MATIÈRE: ${subject?.name || "Général"}
- CHAPITRE: ${chapter?.title || "?"} (${chapter?.subtitle || ""})
- LEÇON: ${event.title}
- RÉSUMÉ: ${event.summary || ""}

Format JSON STRICT:
{
  "title": "${event.title}",
  "intro": "Paragraphe d'introduction (3-4 phrases) qui pose la leçon et son utilité pour l'examen national",
  "sections": [
    {
      "heading": "1. Définition",
      "content": "Texte explicatif clair, 2-4 paragraphes courts. Décimales avec virgule.",
      "formulas": ["F = m × a (force = masse × accélération)"],
      "example": "Exemple concret avec chiffres",
      "tip": "Astuce de l'examinateur ou piège fréquent"
    },
    {
      "heading": "2. ...",
      "content": "...",
      "formulas": [],
      "example": "...",
      "tip": "..."
    }
  ],
  "keyTakeaways": [
    "Point clé 1 à retenir absolument",
    "Point clé 2",
    "Point clé 3"
  ],
  "miniQuiz": [
    {
      "type": "multiple_choice",
      "question": "Question claire et concise",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Pourquoi A est correct"
    },
    {
      "type": "multiple_choice",
      "question": "Q2",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 2,
      "explanation": "..."
    },
    {
      "type": "fill_blank",
      "question": "La formule de la force est F = m × ___",
      "correctAnswer": "a",
      "explanation": "F = m × a (deuxième loi de Newton)"
    }
  ]
}

RÈGLES:
- 3-5 sections, chacune avec content + au moins 1 example
- Au moins 5 questions dans miniQuiz, mélange de multiple_choice et fill_blank
- Décimales avec virgule (9,8 m/s²)
- AUCUN markdown, AUCUN LaTeX, AUCUN $math$
- Niveau adapté à ${track}: ${track === "9AF" ? "vocabulaire simple, exemples du quotidien" : "rigueur scientifique, formules formelles"}`;
}
