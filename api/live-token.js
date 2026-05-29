// api/live-token.js v18
// FIX: Uses the REAL model name "gemini-3.1-flash-live-preview" per official docs.
// My previous candidate model names didn't exist → that's why all 8 returned 404.

const PERSONA_VOICES = {
  joseph: { gemini: "Achernar", systemBase: "Tu es M. JOSEPH, prof haïtien chevronné de 62 ans, patient, fatherly." },
  tikens: { gemini: "Puck", systemBase: "Tu es TI-KENS, jeune prof 21 ans, énergique." },
  victoria: { gemini: "Aoede", systemBase: "Tu es Mlle. VICTORIA, mentor brillante 28 ans, élégante, inspirante." },
  marckenson: { gemini: "Charon", systemBase: "Tu es M. MARCKENSON, coach intense 32 ans, pousse fort mais PG." },
  camille: { gemini: "Leda", systemBase: "Tu es Mlle. CAMILLE, grande sœur 25 ans, bienveillante." },
};

// REAL model names — verified from Google's docs April 2026
const FALLBACK_MODELS = [
  "gemini-3.1-flash-live-preview",
  "gemini-live-2.5-flash-preview",
  "gemini-2.0-flash-live-001",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { persona = "joseph", language = "fr", exerciseContext = null, studentName = "" } = req.body || {};
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "Gemini API key not configured" });

    const voice = PERSONA_VOICES[persona] || PERSONA_VOICES.joseph;

    const langInstruction =
      language === "fr" ? "Parle français uniquement."
      : language === "kr" ? "Pale kreyòl prensipalman."
      : "Mélange français et kreyòl naturellement.";

    let systemPrompt = `${voice.systemBase}
${studentName ? `L'élève s'appelle ${studentName}.` : ""}
${langInstruction}
Tu es en appel vocal avec un élève haïtien préparant son examen national.
Réponses COURTES et conversationnelles (1-3 phrases). Encourage. Si l'élève montre sa caméra, commente ce que tu vois.`;

    if (exerciseContext) {
      systemPrompt += `\n\nEXERCICE: ${JSON.stringify(exerciseContext).substring(0, 1200)}`;
    }

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

    const errors = [];

    for (const model of FALLBACK_MODELS) {
      const body = {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: `models/${model}`,
          config: {
            responseModalities: ["AUDIO"],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.gemini } },
            },
          },
        },
      };

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1alpha/auth_tokens:create?key=${GEMINI_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const token = data.name || data.token;
          return res.status(200).json({
            data: {
              token,
              model,
              voiceName: voice.gemini,
              persona,
              modelUsed: model,
              expiresAt: Date.now() + 30 * 60 * 1000,
            },
          });
        }

        const errText = await response.text();
        errors.push({ model, status: response.status, error: errText.substring(0, 200) });
      } catch (err) {
        errors.push({ model, exception: err.message });
      }
    }

    console.error("Live token mint failed all models:", JSON.stringify(errors));
    return res.status(502).json({
      error: "Failed to mint live token",
      details: "All Live model attempts failed.",
      attempts: errors,
    });
  } catch (err) {
    console.error("/api/live-token error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
