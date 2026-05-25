// api/solve.js
// Updated for May 2026 model availability.
// OCR: Gemini 3.5 Flash (vision, fast, reliable)
// Solve cascade: GPT-5.5 → Claude Opus 4.7 → Gemini 3 Pro Preview

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

  // Try multiple vision models in cascade — they all have vision
  const visionModels = [
    "google/gemini-3.5-flash",
    "google/gemini-3-flash-preview",
    "anthropic/claude-opus-4.7",
    "openai/gpt-5.5",
  ];

  for (const model of visionModels) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${KEY}`,
          "HTTP-Referer": "https://laureatai.com",
          "X-Title": "Laureat AI",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `Tu es un OCR de précision pour des exercices d'examen haïtiens (MENFP).

Transcris le texte visible dans l'image avec précision:
- Garde les symboles mathématiques (×, ÷, ², ³, √, π, ≤, ≥, etc.)
- Garde les indices et exposants (P_r, m², h³)
- Garde les unités (kg, m/s², g/cm³)
- Utilise la virgule pour les décimales

Sois TOLÉRANT: si le texte est partiellement lisible, transcris ce que tu vois et marque les parties incertaines avec [?].

Réponds en JSON:
{"text": "ta transcription", "confidence": "high|medium|low", "partial": true|false}

Réponds "error" SEULEMENT si l'image ne contient AUCUN texte lisible ou si elle est complètement noire/blanche.`,
            },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: imageUrl } },
                {
                  type: "text",
                  text: "Transcris cet exercice. Même si une partie est floue, donne-moi ce que tu vois.",
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        console.warn(`Vision model ${model} returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw) continue;

      const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Only reject if explicitly errored AND no text returned
      if (parsed.error && !parsed.text) {
        return { error: "L'image n'est pas assez claire. Cadre l'exercice de plus près avec plus de lumière." };
      }

      // Accept even low confidence — let the solver try
      if (parsed.text && parsed.text.length > 10) {
        return { text: parsed.text };
      }
    } catch (err) {
      console.warn(`Vision model ${model} failed:`, err.message);
      continue;
    }
  }

  return {
    error: "Pa kapab li imaj la. Cadre l'exercice de plus près avec plus de lumière, ou tape l'énoncé manuellement.",
  };
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
    {"symbol": "P", "value": "?", "unit": "", "isQuestion": true}
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
    }
  ],
  "traps": ["piège 1", "piège 2"]
}

Step types: "formula", "substitution", "result" (avec boxed=true), "conversion" (avec note), "deduction", "note".

Réponds UNIQUEMENT avec le JSON.`;

  // Cascade through available 2026 models
  const models = [
    "openai/gpt-5.5",
    "openai/gpt-5.4",
    "anthropic/claude-opus-4.7",
    "google/gemini-3-pro-preview",
    "google/gemini-3.5-flash",
    "google/gemini-3-flash-preview",
  ];

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
        console.warn(`Solver model ${model} returned ${response.status}`);
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
      console.warn(`Solver ${model} error:`, err.message);
      continue;
    }
  }

  return { error: "Tous les modèles AI ont échoué. Vérifie ton crédit OpenRouter." };
}
