// api/transcribe.js
// v13: Robust voice transcription. Gemini audio understanding primary.
// Returns clear errors so frontend can tell user what happened.
// Voice input = speech→text→sent as normal text message (correct design).

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { audioData, language, mimeType } = req.body || {};
    if (!audioData) return res.status(400).json({ error: "Missing audio data" });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "Gemini key not configured" });

    // Parse the MIME type from the data URL if present
    let detectedMime = mimeType || "audio/webm";
    const dataUrlMatch = audioData.match(/^data:(audio\/[^;]+);base64,/);
    if (dataUrlMatch) detectedMime = dataUrlMatch[1];

    const base64 = audioData.replace(/^data:audio\/[^;]+;base64,/, "");

    if (!base64 || base64.length < 100) {
      return res.status(400).json({ error: "Audio too short or empty" });
    }

    const result = await geminiTranscribe(base64, detectedMime, language, GEMINI_KEY);
    if (result?.text) {
      return res.status(200).json({
        data: {
          text: result.text,
          language: result.language || "fr",
          modelUsed: "gemini-3.5-flash-audio",
        },
      });
    }

    return res.status(502).json({
      error: result?.error || "Transcription returned no text",
    });
  } catch (err) {
    console.error("/api/transcribe error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

async function geminiTranscribe(base64Audio, mimeType, languageHint, apiKey) {
  try {
    // Normalize MIME for Gemini — it accepts audio/webm, audio/ogg, audio/mp4, audio/wav
    let geminiMime = mimeType;
    if (mimeType.includes("webm")) geminiMime = "audio/webm";
    else if (mimeType.includes("ogg")) geminiMime = "audio/ogg";
    else if (mimeType.includes("mp4")) geminiMime = "audio/mp4";
    else if (mimeType.includes("wav")) geminiMime = "audio/wav";

    const langInstruction =
      languageHint === "ht"
        ? "Le locuteur parle Haitian Creole (kreyòl ayisyen)."
        : "Le locuteur parle français ou Haitian Creole (kreyòl ayisyen).";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: geminiMime, data: base64Audio } },
              {
                text: `${langInstruction} Transcris cet audio mot pour mot. Si tu n'entends rien de clair, réponds avec un texte vide. Réponds UNIQUEMENT en JSON: {"text": "la transcription exacte", "language": "fr" ou "ht"}`,
              },
            ],
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini transcribe HTTP ${response.status}:`, errText.substring(0, 300));
      return { error: `Transcription service error ${response.status}` };
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return { error: "No transcription returned" };

    try {
      const parsed = JSON.parse(raw.replace(/```json\s*|\s*```/g, "").trim());
      return { text: (parsed.text || "").trim(), language: parsed.language || "fr" };
    } catch {
      // If not JSON, use raw text
      return { text: raw.trim(), language: languageHint || "fr" };
    }
  } catch (err) {
    console.error("Gemini transcribe exception:", err.message);
    return { error: err.message };
  }
}
