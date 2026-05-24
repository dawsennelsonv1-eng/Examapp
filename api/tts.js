// api/tts.js
// Text-to-speech endpoint.
// Uses OpenAI TTS via OpenRouter for natural French voice.
// Returns audio as base64 data URL.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, voice = "alloy" } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text" });

    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    // Limit text length to control costs
    const cleanText = text.substring(0, 4000);

    // OpenRouter doesn't directly support TTS, so we use OpenAI's API.
    // For MVP, we'll use the Gemini TTS via OpenRouter if available.
    // Fallback: return null so frontend uses browser Web Speech API.

    // Try Google's Gemini TTS via OpenRouter
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
          model: "google/gemini-3.1-flash-tts-preview",
          messages: [
            {
              role: "user",
              content: cleanText,
            },
          ],
          modalities: ["audio"],
          audio: { voice: "Kore", format: "mp3" },
        }),
      }
    );

    if (!response.ok) {
      // TTS not available — tell frontend to use browser fallback
      return res.status(200).json({
        data: { useBrowserFallback: true, text: cleanText },
      });
    }

    const data = await response.json();
    const audioData = data?.choices?.[0]?.message?.audio?.data;

    if (!audioData) {
      return res.status(200).json({
        data: { useBrowserFallback: true, text: cleanText },
      });
    }

    return res.status(200).json({
      data: {
        audioUrl: `data:audio/mp3;base64,${audioData}`,
        useBrowserFallback: false,
      },
    });
  } catch (err) {
    console.error("/api/tts error:", err);
    // Always fall back gracefully
    return res.status(200).json({
      data: { useBrowserFallback: true, text: req.body?.text || "" },
    });
  }
}
