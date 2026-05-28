// api/live-token.js
// v11: Mints ephemeral Gemini Live API tokens for real-time voice calls.
// Premium users only. Token is short-lived so frontend can connect WebSocket safely.

const PERSONA_VOICES = {
  joseph: { gemini: "Achernar", systemBase: "Tu es M. JOSEPH, prof haïtien chevronné de 62 ans, fatherly, patient. Tu parles avec sagesse et patience." },
  tikens: { gemini: "Algenib", systemBase: "Tu es TI-KENS, jeune prof 21 ans, énergique. Tu parles avec énergie et enthousiasme." },
  victoria: { gemini: "Aoede", systemBase: "Tu es Mlle. VICTORIA, mentor brillante 28 ans, élégante, inspirante (pas romantique). Tu valides l'intelligence." },
  marckenson: { gemini: "Algieba", systemBase: "Tu es M. MARCKENSON, coach intense 32 ans. Tu pousses fort mais PG, respectueux, jamais grossier." },
  camille: { gemini: "Vega", systemBase: "Tu es Mlle. CAMILLE, grande sœur 25 ans, bienveillante, safe space." },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { persona = "joseph", language = "mix", exerciseContext = null, studentName = "" } = req.body || {};

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "Gemini API key not configured" });

    const voice = PERSONA_VOICES[persona] || PERSONA_VOICES.joseph;

    const langInstruction =
      language === "fr" ? "Parle français principalement."
      : language === "kr" ? "Pale kreyòl prensipalman. Mo teknik fransè kote ki nesesè."
      : "Mélange français et kreyòl naturellement. Kreyòl pour l'humain, français pour le technique. Use 'm' (pas 'mwen'), 'w' (pas 'ou'), 'l' (pas 'li').";

    let systemPrompt = `${voice.systemBase}

${studentName ? `L'élève s'appelle ${studentName}.` : ""}
${langInstruction}

CONTEXTE:
Tu es en appel vocal en temps réel avec un élève haïtien préparant l'examen MENFP (juillet 2026).

RÈGLES POUR L'APPEL VOCAL:
- Réponses courtes et conversationnelles (1-3 phrases max par tour)
- Pose des questions, vérifie la compréhension
- Si l'élève partage sa caméra, regarde ce qu'il te montre et commente
- Encourage activement
- Décimales avec virgule (9,8 pas 9.8)
- Pas de formules longues à l'oral — guide étape par étape`;

    if (exerciseContext) {
      systemPrompt += `\n\nEXERCICE EN COURS:\n${JSON.stringify(exerciseContext).substring(0, 1500)}`;
    }

    // Mint ephemeral token for Gemini Live
    // Token expires in 30 minutes, can only be used to start a new session within that window
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/auth/ephemeral?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uses: 1,
          expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
          liveConnectConstraints: {
            model: "models/gemini-3.1-flash-live-preview",
            config: {
              responseModalities: ["AUDIO"],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice.gemini },
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Live token mint failed:", response.status, errText.substring(0, 300));
      return res.status(502).json({
        error: "Failed to mint live token",
        details: errText.substring(0, 200),
      });
    }

    const data = await response.json();
    return res.status(200).json({
      data: {
        token: data.name || data.token,
        voiceName: voice.gemini,
        persona,
        modelUsed: "gemini-3.1-flash-live-preview",
        expiresAt: Date.now() + 30 * 60 * 1000,
      },
    });
  } catch (err) {
    console.error("/api/live-token error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
