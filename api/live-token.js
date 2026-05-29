// api/live-token.js
// v16: Robust ephemeral token minting. Tries multiple endpoint/model combos because
// Gemini's Live API surface keeps shifting and your key format (AQ.A) is unusual.
// Returns the FIRST working combo + tells frontend which model+endpoint succeeded.

const PERSONA_VOICES = {
  joseph: { gemini: "Achernar", systemBase: "Tu es M. JOSEPH, prof haïtien chevronné de 62 ans, patient, fatherly." },
  tikens: { gemini: "Puck", systemBase: "Tu es TI-KENS, jeune prof 21 ans, énergique." },
  victoria: { gemini: "Aoede", systemBase: "Tu es Mlle. VICTORIA, mentor brillante 28 ans, élégante, inspirante." },
  marckenson: { gemini: "Charon", systemBase: "Tu es M. MARCKENSON, coach intense 32 ans, pousse fort mais PG." },
  camille: { gemini: "Leda", systemBase: "Tu es Mlle. CAMILLE, grande sœur 25 ans, bienveillante." },
};

// Try these models in order until one works
const CANDIDATE_MODELS = [
  "gemini-2.5-flash-native-audio-preview-12-2025",
  "gemini-live-2.5-flash-preview",
  "gemini-2.5-flash-preview-native-audio-dialog",
  "gemini-2.0-flash-live-001",
];

// Try these endpoints in order
const CANDIDATE_ENDPOINTS = [
  "https://generativelanguage.googleapis.com/v1alpha/auth_tokens:create",
  "https://generativelanguage.googleapis.com/v1beta/auth_tokens:create",
];

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
      : language === "kr" ? "Pale kreyòl prensipalman."
      : "Mélange français et kreyòl naturellement. Use 'm', 'w', 'l' contractions.";

    let systemPrompt = `${voice.systemBase}
${studentName ? `L'élève s'appelle ${studentName}.` : ""}
${langInstruction}
Tu es en appel vocal avec un élève haïtien préparant l'examen MENFP.
Réponses COURTES et conversationnelles (1-3 phrases). Encourage. Si l'élève montre sa caméra, commente ce que tu vois.`;

    if (exerciseContext) {
      systemPrompt += `\n\nEXERCICE: ${JSON.stringify(exerciseContext).substring(0, 1200)}`;
    }

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

    const errors = [];

    for (const endpoint of CANDIDATE_ENDPOINTS) {
      for (const model of CANDIDATE_MODELS) {
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
          const response = await fetch(`${endpoint}?key=${GEMINI_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (response.ok) {
            const data = await response.json();
            const token = data.name || data.token;
            // Determine WS endpoint based on REST endpoint version
            const wsVersion = endpoint.includes("v1alpha") ? "v1alpha" : "v1beta";
            return res.status(200).json({
              data: {
                token,
                model,
                voiceName: voice.gemini,
                persona,
                wsVersion,
                modelUsed: model,
                expiresAt: Date.now() + 30 * 60 * 1000,
              },
            });
          }

          const errText = await response.text();
          errors.push({ endpoint, model, status: response.status, error: errText.substring(0, 200) });
        } catch (err) {
          errors.push({ endpoint, model, exception: err.message });
        }
      }
    }

    // All attempts failed
    console.error("Live token mint failed all combos:", JSON.stringify(errors));
    return res.status(502).json({
      error: "Failed to mint live token",
      details: "All endpoint/model combinations failed. Visit /api/diag-live for full details.",
      lastError: errors[errors.length - 1],
    });
  } catch (err) {
    console.error("/api/live-token error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
