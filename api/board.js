// api/board.js
// SVG diagrams. Claude Opus 4.7 primary, cascade fallbacks.

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

    const styleMode = style || "diagram";

    const systemPrompt = `Tu es un professeur haïtien qui dessine des schémas pédagogiques au tableau noir.

STYLE OBLIGATOIRE:
- viewBox="0 0 400 300"
- Fond transparent
- Trait blanc (#ffffff) ou jaune craie (#fef08a) pour les lignes principales
- Rouge (#ef4444) pour vecteurs/forces
- Vert (#86efac) pour résultats annotés
- Bleu (#7dd3fc) pour angles
- Textes en français, font-size 14, font-family: "Caveat", cursive
- Étiqueter clairement
- Flèches via <marker> pour vecteurs
- Pas de fond opaque

Réponds UNIQUEMENT avec le code SVG complet.`;

    const userPrompt = `Sujet: ${subject || "Physique"}
Topic: ${topic || "Schéma général"}
Description: ${description || ""}
Style: ${styleMode}

Génère un schéma pédagogique clair en français, lisible sur fond noir.`;

    const models = [
      "anthropic/claude-opus-4.7",
      "openai/gpt-5.5",
      "google/gemini-3-pro-preview",
      "google/gemini-3.5-flash",
    ];

    for (const model of models) {
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
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 3500,
          }),
        });

        if (!response.ok) {
          console.warn(`Board model ${model} returned ${response.status}`);
          continue;
        }

        const data = await response.json();
        let svg = data?.choices?.[0]?.message?.content || "";
        svg = svg.replace(/```(svg|xml|html)?\s*|\s*```/g, "").trim();

        const svgMatch = svg.match(/<svg[\s\S]*<\/svg>/);
        if (svgMatch) svg = svgMatch[0];

        if (svg.includes("<svg")) {
          return res.status(200).json({
            data: { svg, title: topic, style: styleMode, modelUsed: model },
          });
        }
      } catch (err) {
        console.warn(`Board ${model} failed:`, err.message);
        continue;
      }
    }

    return res.status(502).json({ error: "Pa kapab jenere schéma a. Eseye ankò." });
  } catch (err) {
    console.error("/api/board error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
