// api/solve.js
// Vision-capable solve endpoint.
// Accepts either:
//   - text problems (input.problemText)
//   - image problems (input.imageData as base64 data URL)
//   - both (image + text context)
//
// Returns clean { data: { problemStatement, donnee, formule, steps, finalAnswer, traps } }

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
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
      `Tu es un professeur haïtien expérimenté préparant des élèves pour les examens MENFP.

RÈGLES OBLIGATOIRES:
- Format de réponse: Donnée / Formule / Résolution
- Utilise TOUJOURS des virgules pour les décimales (9,8 pas 9.8)
- Utilise les unités SI (m, s, kg, N, J)
- Ne saute JAMAIS la section Donnée
- Si tu vois une image, transcris D'ABORD l'exercice EXACTEMENT tel qu'il apparaît dans l'image, sans rien inventer
- Si l'image est floue ou illisible, dis-le clairement plutôt que d'inventer un exercice`;

    // Build the user message with optional image
    const userContent = [];

    // Add image first if present
    if (input.imageData) {
      // Make sure data URL format is clean
      let imageUrl = input.imageData;
      if (!imageUrl.startsWith("data:")) {
        imageUrl = `data:image/jpeg;base64,${imageUrl}`;
      }

      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl },
      });

      userContent.push({
        type: "text",
        text: `Tu vois une image d'un exercice de ${input.subject || "physique/maths"} (niveau ${input.track || "NS4"}).

ÉTAPE 1: Transcris l'exercice EXACTEMENT comme il apparaît dans l'image. Ne change RIEN. Ne traduis pas. Ne complète pas si des chiffres manquent.
ÉTAPE 2: Résous-le.

${input.problemText ? `Contexte additionnel de l'élève: ${input.problemText}` : ""}

RÉPONDS AU FORMAT JSON STRICT:
{
  "problemStatement": "TRANSCRIPTION EXACTE de l'exercice dans l'image",
  "donnee": "Données extraites avec valeurs et unités SI",
  "formule": "formule(s) appliquée(s) avec justification brève",
  "steps": [{"title": "Étape 1", "content": "description", "isFormula": false}],
  "finalAnswer": "réponse finale avec unités",
  "traps": ["piège courant 1", "piège courant 2"]
}

Si l'image est illisible: réponds avec {"error": "image_unclear", "message": "explication"} au lieu du JSON normal.

Réponds UNIQUEMENT avec le JSON, aucun texte avant ou après.`,
      });
    } else {
      // Text only mode
      userContent.push({
        type: "text",
        text: `Problème (niveau ${input.track || "NS4"}, matière: ${input.subject || "Physique"}):

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

Règles: virgule pour décimales, unités SI, jamais sauter 'Donnée'. Réponds UNIQUEMENT avec le JSON, aucun texte avant ou après.`,
      });
    }

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
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
          max_tokens: 2500,
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

    // Handle "image unclear" response
    if (solution.error === "image_unclear") {
      return res.status(422).json({
        error: "image_unclear",
        message:
          solution.message ||
          "L'image n'est pas assez claire. Reprends la photo en t'assurant que le texte est lisible.",
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
