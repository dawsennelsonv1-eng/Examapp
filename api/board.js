// api/board.js v19
// Generates an SVG diagram from a textual description, for the Visuel board.
// Uses Claude Opus 4.7 (best at SVG generation) → falls back to GPT.

const MODELS = [
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

  try {
    const { topic, description, subject = "Physique", style = "diagram", exerciseContext = null } = req.body || {};
    if (!description) return res.status(400).json({ error: "Missing description" });

    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    const prompt = buildPrompt(topic, description, subject, style, exerciseContext);

    let svg = null;
    let modelUsed = null;

    for (const model of MODELS) {
      const result = await generateSVG(prompt, model, KEY);
      if (result) {
        svg = result;
        modelUsed = model;
        break;
      }
    }

    if (!svg) {
      return res.status(502).json({ error: "Diagram generation failed" });
    }

    return res.status(200).json({
      data: { svg, modelUsed, style },
    });
  } catch (err) {
    console.error("/api/board error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

function buildPrompt(topic, description, subject, style, exerciseContext) {
  return `Tu es un illustrateur pédagogique. Génère un schéma SVG clair pour aider un élève haïtien à comprendre un concept.

SUJET: ${topic || "concept à illustrer"}
MATIÈRE: ${subject}
DESCRIPTION: ${description}
${exerciseContext ? `CONTEXTE: ${JSON.stringify(exerciseContext).substring(0, 800)}` : ""}

RÈGLES STRICTES:
- Génère UN seul élément <svg> complet (viewBox="0 0 400 300")
- Fond blanc (#ffffff)
- Couleurs: violet (#7c3aed) pour les éléments principaux, ambre (#f59e0b) pour mise en évidence, slate (#1e293b) pour le texte, vert (#10b981) pour les résultats
- Labels en français
- Décimales avec virgule (9,8 pas 9.8)
- Police: sans-serif, 14-16px pour les labels
- Flèches avec marker-end pour les vecteurs/directions
- Si c'est un schéma de physique: dessine les forces, distances, angles clairement
- Si c'est une figure géométrique: cotes et angles annotés
- Si c'est une représentation de "produits en croix": deux fractions avec une croix qui traverse
- AUCUN texte avant ou après le SVG, JUSTE le SVG

Réponds avec le code SVG UNIQUEMENT, commençant par <svg et finissant par </svg>.`;
}

async function generateSVG(prompt, model, apiKey) {
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
        max_tokens: 2500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;

    // Extract the SVG element
    const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
    if (!match) return null;

    // Sanitize: remove any <script> tags
    const svg = match[0].replace(/<script[\s\S]*?<\/script>/gi, "");

    // Validate it's actually parseable XML
    if (!svg.includes("</svg>")) return null;

    return svg;
  } catch (err) {
    console.warn(`SVG gen failed (${model}):`, err.message);
    return null;
  }
}
