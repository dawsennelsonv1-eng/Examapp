// api/board.js
// Generate an educational SVG diagram for the virtual board.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { topic, description, subject } = req.body || {};
    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    const systemPrompt = `Tu es un professeur qui dessine au tableau blanc. Tu génères du SVG éducatif clair.

RÈGLES SVG ABSOLUES:
- viewBox="0 0 400 300" pour schémas simples
- Utilise stroke="currentColor" pour les traits (s'adapte dark/light mode)
- Couleurs: vecteurs/forces en #ef4444 (rouge), éléments principaux en #8b5cf6 (violet)
- Tous les textes en français, font-size entre 12 et 16
- Inclure des flèches via <marker> pour les vecteurs
- SVG autonome (pas de références externes, pas de JavaScript)
- Réponds UNIQUEMENT avec le code SVG complet, rien d'autre`;

    const userPrompt = `Sujet: ${subject || "Physique"}
Topic: ${topic || "Schéma général"}
Description: ${description || ""}

Génère un schéma pédagogique SVG clair et étiqueté en français.`;

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
          max_tokens: 2500,
        }),
      }
    );

    if (!response.ok) {
      return res.status(502).json({ error: "AI service error" });
    }

    const data = await response.json();
    let svg = data?.choices?.[0]?.message?.content || "";
    svg = svg.replace(/```(svg|xml)?\s*|\s*```/g, "").trim();

    if (!svg.includes("<svg")) {
      return res.status(502).json({
        error: "Pa kapab jenere schéma a. Eseye ankò.",
      });
    }

    return res.status(200).json({
      data: { svg, title: topic },
    });
  } catch (err) {
    console.error("/api/board error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
