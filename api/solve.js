// api/solve.js
// Vercel serverless function — Scenario 2 (solve-problem)
// Replaces Make.com entirely for this feature.
//
// Flow: frontend → this function → OpenRouter → Gemini → clean JSON → frontend

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // CORS headers — allow your app's domain to call this
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Extract data from the frontend request
    const { userId, systemPrompt, input } = req.body;

    if (!input?.problemText && !input?.imageData) {
      return res.status(400).json({
        error: "Missing problem text or image",
      });
    }

    // Get OpenRouter API key from environment variable (NEVER hardcode)
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_KEY) {
      console.error("OPENROUTER_API_KEY not set");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    // Default system prompt if none provided
    const finalSystemPrompt = systemPrompt || `
Tu es un professeur haïtien expérimenté. Tu prépares des élèves pour les examens MENFP.
Format de réponse OBLIGATOIRE: Donnée / Formule / Résolution.
Utilise TOUJOURS des virgules pour les décimales (ex: 9,8 pas 9.8).
Utilise les unités SI (m, s, kg, N, J).
Ne saute JAMAIS la section Donnée.
`.trim();

    // Build the user message
    const userMessage = `Problème à résoudre (niveau ${input.track}, matière: ${input.subject}):

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

    // Call OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": "https://laureatai.com", // helps OpenRouter track usage
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      return res.status(502).json({
        error: "AI service error",
        details: errorText.substring(0, 200),
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("No content in OpenRouter response:", data);
      return res.status(502).json({ error: "Empty AI response" });
    }

    // Parse the AI's JSON response
    let solution;
    try {
      // Clean potential markdown fences
      const cleaned = rawContent.replace(/```json\s*|\s*```/g, "").trim();
      solution = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse failed:", rawContent);
      return res.status(502).json({
        error: "AI returned invalid JSON",
        rawContent: rawContent.substring(0, 500),
      });
    }

    // Return clean structured data to frontend
    return res.status(200).json({
      data: {
        problemStatement: solution.problemStatement || "",
        donnee: solution.donnee || "",
        formule: solution.formule || "",
        steps: solution.steps || [],
        finalAnswer: solution.finalAnswer || "",
        traps: solution.traps || [],
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({
      error: "Server error",
      message: err.message,
    });
  }
}
