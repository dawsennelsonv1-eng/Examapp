// api/solve.js
// Two-phase solve:
//   Phase 1 - OCR/transcription with Gemini 3 Pro Vision (high accuracy)
//   Phase 2 - Solve with top math model (GPT-5 primary, Gemini 3 Pro fallback)
//
// Returns: Haitian textbook format with multi-section solution.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId, input } = req.body || {};
    if (!input?.problemText && !input?.imageData) {
      return res.status(400).json({ error: "Missing problem text or image" });
    }

    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    // PHASE 1: OCR transcription (if image provided)
    let problemText = input.problemText || "";
    if (input.imageData) {
      const transcription = await transcribeWithVision(input.imageData, KEY);
      if (transcription.error) {
        return res.status(422).json({
          error: "image_unclear",
          message: transcription.error,
        });
      }
      problemText = transcription.text;
    }

    // PHASE 2: Solve in Haitian textbook format
    const solution = await solveInHaitianFormat({
      problemText,
      subject: input.subject || "Physique",
      track: input.track || "NS4",
      key: KEY,
    });

    if (solution.error) {
      return res.status(502).json({ error: solution.error });
    }

    return res.status(200).json({
      data: {
        originalText: problemText,
        ...solution.data,
      },
    });
  } catch (err) {
    console.error("/api/solve error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

async function transcribeWithVision(imageData, KEY) {
  let imageUrl = imageData;
  if (!imageUrl.startsWith("data:")) {
    imageUrl = `data:image/jpeg;base64,${imageUrl}`;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
      "HTTP-Referer": "https://laureatai.com",
      "X-Title": "Laureat AI",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-preview",
      messages: [
        {
          role: "system",
          content: `Tu es un OCR de haute précision pour des exercices d'examen haïtiens (MENFP).
Transcris EXACTEMENT le texte de l'image, en respectant:
- Les symboles mathématiques (×, ÷, ², ³, √, π, ≤, ≥, etc.)
- Les indices et exposants (P_r, m², h^3)
- Les unités (kg, m/s², g/cm³, etc.)
- La ponctuation française (virgule pour décimales)
- Les retours à la ligne et la structure

Si l'image est illisible ou ne contient pas d'exercice clair, réponds:
{"error": "Description du problème en français"}

Sinon réponds en JSON:
{"text": "transcription exacte de l'exercice", "confidence": "high|medium|low"}`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: "Transcris cet exercice exactement comme il apparaît." },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    return { error: "Impossible de lire l'image. Reprends une photo plus claire." };
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) return { error: "Image vide ou illisible." };

  try {
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.error) return { error: parsed.error };
    if (parsed.confidence === "low") {
      return { error: "L'image n'est pas assez claire. Reprends une photo avec plus de lumière." };
    }
    return { text: parsed.text || "" };
  } catch {
    return { text: raw };
  }
}

async function solveInHaitianFormat({ problemText, subject, track, key }) {
  const systemPrompt = `Tu es un professeur haïtien expert qui résout des exercices pour les examens MENFP (${track}).

FORMAT HAÏTIEN OBLIGATOIRE:
1. Restitue l'énoncé reformulé proprement
2. Liste les DONNÉES en colonne (variable = valeur unité)
3. Pour chaque question, utilise le bon verbe d'introduction:
   - "Calculons" = quand on demande de calculer directement
   - "Cherchons" = quand il faut trouver une grandeur non donnée
   - "Déterminons" = pour prouver/dériver/identifier
   - "Vérifions" = pour vérifier une affirmation
   - "Démontrons" = pour démontrer une propriété
   - "Déduisons" = quand on déduit d'un résultat précédent
   - "On sait que" / "Alors on a" = liaisons entre étapes
4. Pour chaque étape: formule symbolique → substitution → résultat encadré
5. Décimales avec virgule (9,8 pas 9.8)
6. Unités SI ou unités du problème
7. Si conversion d'unités nécessaire, le faire visiblement dans la solution

PIÈGES À IDENTIFIER:
- Erreurs communes des élèves sur ce type d'exercice
- Confusions possibles avec d'autres formules`;

  const userPrompt = `Résous cet exercice de ${subject} (niveau ${track}):

${problemText}

RÉPONDS EN JSON STRICT:
{
  "enonce": "énoncé reformulé proprement",
  "donnees": [
    {"symbol": "P_r", "value": "105", "unit": "N"},
    {"symbol": "P_a", "value": "65", "unit": "N"},
    {"symbol": "μ", "value": "8", "unit": "g/cm³"},
    {"symbol": "P", "value": "?", "unit": "", "isQuestion": true},
    {"symbol": "d", "value": "?", "unit": "", "isQuestion": true}
  ],
  "sections": [
    {
      "number": 1,
      "verb": "Calculons",
      "title": "la poussée d'Archimède",
      "steps": [
        {"type": "formula", "content": "P = P_r - P_a"},
        {"type": "substitution", "content": "P = 105 - 65"},
        {"type": "result", "content": "P = 40 N", "boxed": true}
      ]
    },
    {
      "number": 2,
      "verb": "Déterminons",
      "title": "le diamètre de la sphère",
      "steps": [
        {"type": "conversion", "content": "μ = 8 g/cm³ = 8000 kg/m³", "note": "conversion nécessaire"},
        {"type": "formula", "content": "V = πd³/6"},
        {"type": "substitution", "content": "V = π × d³ / 6"},
        {"type": "result", "content": "d ≈ 1,359 cm", "boxed": true}
      ]
    }
  ],
  "traps": [
    "Oublier de convertir g/cm³ en kg/m³ avant le calcul final",
    "Confondre rayon et diamètre dans la formule du volume"
  ]
}

Step types possibles: "formula" (formule symbolique), "substitution" (avec valeurs), "result" (résultat avec boxed=true), "conversion" (conversion d'unités), "deduction" (avec verb comme "Alors", "Donc"), "note" (texte explicatif court).

Réponds UNIQUEMENT avec le JSON.`;

  // Try GPT-5 first (best at math), fallback to Gemini 3 Pro
  const models = ["openai/gpt-5", "google/gemini-3-pro-preview"];

  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://laureatai.com",
          "X-Title": "Laureat AI",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        console.warn(`Model ${model} failed:`, response.status);
        continue;
      }

      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw) continue;

      const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        data: {
          modelUsed: model,
          enonce: parsed.enonce || problemText,
          donnees: Array.isArray(parsed.donnees) ? parsed.donnees : [],
          sections: Array.isArray(parsed.sections) ? parsed.sections : [],
          traps: Array.isArray(parsed.traps) ? parsed.traps : [],
        },
      };
    } catch (err) {
      console.warn(`Error with ${model}:`, err.message);
      continue;
    }
  }

  return { error: "All AI models failed to solve" };
}
