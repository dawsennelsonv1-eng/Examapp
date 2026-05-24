// api/solve.js
// Vercel serverless function — solves a problem via OpenRouter / Gemini.
// Frontend calls /api/solve with { input: { problemText, subject, track } }
// Returns clean { data: { problemStatement, donnee, formule, steps, finalAnswer, traps } }

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, systemPrompt, input } = req.body || {};

    if (!input?.problemText && !input?.imageData) {
      return res.status(400).json({
        error: "Missing problem text or image",
      });
    }

    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_KEY) {
      console.error("OPENROUTER_API_KEY env var not set");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const finalSystemPrompt =
      systemPrompt ||
      "Tu es un professeur haïtien expérimenté préparant des élèves pour les examens MENFP. Format de réponse OBLIGATOIRE: Donnée / Formule / Résolution. Utilise TOUJOURS des virgules pour les décimales (9,8 pas 9.8). Utilise les unités SI. Ne saute JAMAIS la section Donnée.";

    const userMessage = `Problème (niveau ${input.track || "NS4"}, matière: ${input.subject || "Physique"}):

${input.problemText}

RÉPONDS AU FORMAT JSON STRICT:
{
  "problemStatement": "énoncé reformulé proprement",
  "donnee": "Donnée complète avec valeurs et unités SI",
  "formule": "formule(s) appliquée(s) avec justification brève",
  "steps": [{"title": "Étape 1", "content": "description", "isFormula": false}],
  "finalAnswer": "réponse finale avec unités",
  "traps": ["piège courant 1", "piège courant 2"]
}

Règles: virgule pour décimales, unités SI, jamais sauter 'Donnée'. Réponds UNIQUEMENT avec le JSON, aucun texte avant ou après.`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": "https://laureatai.com",
          "X-Title": "Laureat AI",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: finalSystemPrompt },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      return res.status(502).json({
        error: "AI service error",
        details: errorText.substring(0, 200),
      });
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("No content in OpenRouter response:", JSON.stringify(data));
      return res.status(502).json({ error: "Empty AI response" });
    }

    let solution;
    try {
      const cleaned = rawContent.replace(/```json\s*|\s*```/g, "").trim();
      solution = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse failed. Raw content:", rawContent);
      return res.status(502).json({
        error: "AI returned invalid JSON",
        rawContent: rawContent.substring(0, 500),
      });
    }

    return res.status(200).json({
      data: {
        problemStatement: solution.problemStatement || "",
        donnee: solution.donnee || "",
        formule: solution.formule || "",
        steps: Array.isArray(solution.steps) ? solution.steps : [],
        finalAnswer: solution.finalAnswer || "",
        traps: Array.isArray(solution.traps) ? solution.traps : [],
      },
    });
  } catch (err) {
    console.error("Unexpected error in /api/solve:", err);
    return res.status(500).json({
      error: "Server error",
      message: err.message,
    });
  }
}
