// api/generate-quizzes.js
// Admin endpoint: takes past exam PDFs/text, generates 50 fresh MCQs per subject.
// Output is cached and served to all users for 1 week.
//
// Storage: uses Vercel KV (or falls back to localStorage on client).
// For MVP simplicity, we use a simple in-memory cache + return JSON to be saved client-side.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Simple admin auth — only the owner should call this
  const adminToken = req.headers["x-admin-token"];
  const ADMIN_SECRET = process.env.ADMIN_SECRET || "laureat-admin-2026";
  if (adminToken !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { subject, track, pastExamsText, count = 50 } = req.body || {};
    if (!subject || !pastExamsText) {
      return res.status(400).json({
        error: "Missing subject or pastExamsText",
      });
    }

    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    const systemPrompt = `Tu es un créateur d'examens MENFP haïtien expert. Tu analyses des examens passés et tu génères de NOUVELLES questions qui imitent EXACTEMENT le style officiel.

RÈGLES STRICTES:
- Questions doivent ressembler à de vraies questions MENFP (niveau ${track || "NS4"})
- 4 options par question (A, B, C, D)
- Une seule bonne réponse
- Inclure une explication pédagogique pour chaque question
- Mentionner l'année d'un examen similaire (entre 2018 et 2025)
- Inclure les pièges typiques que les élèves font
- Mélanger difficultés: 40% facile, 40% moyen, 20% difficile
- Décimales avec virgule (9,8 pas 9.8)
- Unités SI`;

    const userPrompt = `Voici des extraits d'examens MENFP passés pour la matière "${subject}":

${pastExamsText.substring(0, 15000)}

Génère ${count} NOUVELLES questions à choix multiple inspirées par ce style, mais qui ne sont PAS des copies. Couvre tous les chapitres importants.

FORMAT JSON STRICT:
{
  "questions": [
    {
      "id": "q1",
      "subject": "${subject}",
      "difficulty": "moyen",
      "question": "énoncé de la question",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 0,
      "explanation": "explication pédagogique détaillée",
      "askedIn": {"year": 2023, "session": "Juillet"},
      "trap": "le piège typique des élèves sur ce type de question"
    }
  ]
}

Réponds UNIQUEMENT avec le JSON.`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${KEY}`,
          "HTTP-Referer": "https://laureatai.com",
          "X-Title": "Laureat AI",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          max_tokens: 16000,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({
        error: "AI service error",
        details: errText.substring(0, 200),
      });
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return res.status(502).json({ error: "Empty response" });

    let parsed;
    try {
      const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(502).json({
        error: "Invalid JSON from AI",
        rawContent: raw.substring(0, 500),
      });
    }

    return res.status(200).json({
      data: {
        subject,
        track: track || "NS4",
        generatedAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week
        questions: parsed.questions || [],
      },
    });
  } catch (err) {
    console.error("/api/generate-quizzes error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
