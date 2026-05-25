// api/board.js
// Generate SVG diagrams via Claude Opus 4.7 (best at spatial/visual reasoning).

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { topic, description, subject, style } = req.body || {};
    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    const styleMode = style || "diagram"; // "diagram" or "geometric" or "physics"

    const systemPrompt = `Tu es un professeur haïtien qui dessine des schémas pédagogiques au tableau noir.

STYLE OBLIGATOIRE:
- viewBox="0 0 400 300" (paysage)
- Fond transparent (le tableau noir est ajouté par l'app)
- Trait blanc (#ffffff) ou jaune craie (#fef08a) pour les lignes principales
- Rouge (#ef4444) pour les forces, vecteurs, et éléments clés
- Vert (#86efac) pour les valeurs/résultats annotés
- Bleu (#7dd3fc) pour les angles
- Textes en français, font-size 14, font-family: "Caveat", "Comic Sans MS", cursive (effet manuscrit)
- Toujours étiqueter clairement (légende, mesures, points)
- Inclure des flèches pour vecteurs via <marker>
- Pas de remplissage opaque qui cache le tableau

INTERDICTIONS:
- Pas de couleurs sombres (le fond est noir)
- Pas d'images externes ou ressources distantes
- Pas de JavaScript dans le SVG
- Pas de fond opaque non-transparent

Réponds UNIQUEMENT avec le code SVG complet, prêt à insérer dans le DOM.`;

    const userPrompt = `Sujet: ${subject || "Physique"}
Topic: ${topic || "Schéma général"}
Description: ${description || ""}
Style demandé: ${styleMode}

Génère un schéma pédagogique clair et étiqueté en français, lisible sur fond noir.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
        "HTTP-Referer": "https://laureatai.com",
        "X-Title": "Laureat AI",
      },
      body: JSON.stringify({
        model: "anthropic/claude-opus-4.7",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 3500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Board generation failed:", errText);
      return res.status(502).json({ error: "AI service error" });
    }

    const data = await response.json();
    let svg = data?.choices?.[0]?.message?.content || "";
    svg = svg.replace(/```(svg|xml|html)?\s*|\s*```/g, "").trim();

    // Extract just the <svg>...</svg> if there's extra text
    const svgMatch = svg.match(/<svg[\s\S]*<\/svg>/);
    if (svgMatch) svg = svgMatch[0];

    if (!svg.includes("<svg")) {
      return res.status(502).json({ error: "Pa kapab jenere schéma a. Eseye ankò." });
    }

    return res.status(200).json({
      data: { svg, title: topic, style: styleMode },
    });
  } catch (err) {
    console.error("/api/board error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
