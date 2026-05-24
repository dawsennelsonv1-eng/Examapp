// api/chat.js
// Tutor chat endpoint — conversational replies in Creole/French code-switching.
// Optionally generates an SVG board diagram if student asks for visual.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sessionId, context, messages, userMessage } = req.body || {};
    if (!userMessage) {
      return res.status(400).json({ error: "Missing userMessage" });
    }

    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    const systemPrompt = `Tu es un professeur haïtien virtuel dans une salle de classe. L'élève discute avec toi.

STYLE:
- Réponds comme un vrai professeur qui parle à l'élève
- Pose une question si ça aide à vérifier sa compréhension
- Utilise des exemples concrets de la vie haïtienne
- Commence souvent par "Bon, gade sa..." ou "Pwen nan kesyon sa a se..."

CODE-SWITCHING (CRITIQUE):
- Kreyòl pou aksyon, ankourajman, navigasyon
- Français pou termes techniques: "on sait que", "alors", "donc", "soit", "d'après la formule"

LIMITES:
- Maximum 3-4 phrases par réponse (sauf si l'élève demande plus)
- Pas de discours, conduis la conversation
- Si l'élève demande un schéma ou dessin, inclus un SVG dans ta réponse

${context ? `CONTEXTE: L'élève travaillait sur: "${context.problem || ""}" et était bloqué à l'étape: "${context.fromStep || ""}"` : ""}

FORMAT DE RÉPONSE JSON STRICT:
{
  "reply": "ta réponse conversationnelle (3-4 phrases max)",
  "shouldDrawBoard": true ou false,
  "boardSvg": "<svg>...</svg> ou null"
}

Si shouldDrawBoard est true, le SVG doit avoir viewBox "0 0 400 300", stroke="currentColor" pour les traits, #ef4444 pour les vecteurs/forces, #8b5cf6 pour les éléments principaux, textes en français.`;

    // Convert message history to OpenAI format
    const conversationHistory = (messages || []).slice(-10).map((m) => ({
      role: m.role === "tutor" || m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

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
          messages: apiMessages,
          response_format: { type: "json_object" },
          max_tokens: 1500,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", errText);
      return res.status(502).json({ error: "AI service error" });
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return res.status(502).json({ error: "Empty response" });

    let parsed;
    try {
      const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Parse failed:", raw);
      // Fallback: use raw text as reply
      parsed = { reply: raw, shouldDrawBoard: false, boardSvg: null };
    }

    return res.status(200).json({
      data: {
        reply: parsed.reply || "M ap reflechi sou sa...",
        shouldDrawBoard: Boolean(parsed.shouldDrawBoard),
        boardSvg: parsed.boardSvg || null,
      },
    });
  } catch (err) {
    console.error("/api/chat error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
