// api/transcribe.js
// v11: Gemini audio understanding for voice input.
// Cheaper than Whisper + supports French AND Haitian Creole natively.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { audioData, language } = req.body || {};
    if (!audioData) return res.status(400).json({ error: "Missing audio data" });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

    // Strip data URL prefix
    const base64 = audioData.replace(/^data:audio\/[^;]+;base64,/, "");

    // Primary: Gemini audio understanding
    if (GEMINI_KEY) {
      const result = await geminiTranscribe(base64, language, GEMINI_KEY);
      if (result?.text) {
        return res.status(200).json({
          data: {
            text: result.text,
            language: result.language || "fr",
            modelUsed: "gemini-3.5-flash-audio",
          },
        });
      }
    }

    // Backup: OpenRouter Whisper
    if (OPENROUTER_KEY) {
      const result = await whisperTranscribe(base64, language, OPENROUTER_KEY);
      if (result?.text) {
        return res.status(200).json({
          data: {
            text: result.text,
            language: result.language || "fr",
            modelUsed: "openai/whisper-large-v3",
          },
        });
      }
    }

    return res.status(502).json({ error: "Transcription failed - all backends unavailable" });
  } catch (err) {
    console.error("/api/transcribe error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

async function geminiTranscribe(base64Audio, languageHint, apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: "audio/webm",
                  data: base64Audio,
                },
              },
              {
                text: `Transcris cet audio exactement. Le locuteur parle ${
                  languageHint === "ht" ? "Haitian Creole" : "français ou Haitian Creole"
                }. Réponds en JSON: {"text": "transcription exacte", "language": "fr" ou "ht"}. Aucune explication, juste le JSON.`,
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
      console.warn(`Gemini transcribe error ${response.status}:`, errText.substring(0, 200));
      return null;
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw.replace(/```json\s*|\s*```/g, "").trim());
      return { text: parsed.text || "", language: parsed.language || "fr" };
    } catch {
      return { text: raw.trim(), language: languageHint || "fr" };
    }
  } catch (err) {
    console.warn("Gemini transcribe failed:", err.message);
    return null;
  }
}

async function whisperTranscribe(base64Audio, languageHint, apiKey) {
  try {
    const audioBuffer = Buffer.from(base64Audio, "base64");
    const boundary = `----WB${Math.random().toString(36).slice(2)}`;
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="file"; filename="audio.webm"\r\n`),
      Buffer.from(`Content-Type: audio/webm\r\n\r\n`),
      audioBuffer,
      Buffer.from(`\r\n--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="model"\r\n\r\nopenai/whisper-large-v3\r\n`),
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="language"\r\n\r\n${languageHint || "fr"}\r\n`),
      Buffer.from(`--${boundary}--\r\n`),
    ]);

    const response = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) return null;
    const data = await response.json();
    return { text: data.text || "", language: data.language || "fr" };
  } catch (err) {
    return null;
  }
}
