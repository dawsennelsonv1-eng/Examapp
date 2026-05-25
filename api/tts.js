// api/tts.js
// Voice synthesis. Two backends:
//   - ElevenLabs (premium, multilingual, best French/Kreyòl) - if ELEVENLABS_API_KEY is set
//   - OpenAI TTS via OpenRouter (default, good quality, cheaper)
//
// Returns audio as base64 data URL.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text, voice, isPremium } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text" });

    const cleanText = text.substring(0, 4000);
    const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;

    // Use ElevenLabs for premium users if key is configured
    if (isPremium && ELEVEN_KEY) {
      const audio = await elevenLabsTTS(cleanText, voice || "Bella", ELEVEN_KEY);
      if (audio) {
        return res.status(200).json({
          data: {
            audioUrl: `data:audio/mp3;base64,${audio}`,
            backend: "elevenlabs",
            useBrowserFallback: false,
          },
        });
      }
    }

    // Default: OpenAI TTS via OpenRouter (covers French + Kreyòl decently)
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    if (OPENROUTER_KEY) {
      const audio = await openAITTSViaRouter(cleanText, voice || "nova", OPENROUTER_KEY);
      if (audio) {
        return res.status(200).json({
          data: {
            audioUrl: `data:audio/mp3;base64,${audio}`,
            backend: "openai",
            useBrowserFallback: false,
          },
        });
      }
    }

    // Final fallback: tell client to use browser Web Speech API
    return res.status(200).json({
      data: { useBrowserFallback: true, text: cleanText },
    });
  } catch (err) {
    console.error("/api/tts error:", err);
    return res.status(200).json({
      data: { useBrowserFallback: true, text: req.body?.text || "" },
    });
  }
}

async function elevenLabsTTS(text, voiceId, apiKey) {
  try {
    // Use multilingual model for French/Kreyòl support
    const VOICE_IDS = {
      Bella: "EXAVITQu4vr4xnSDxMaL", // Multilingual female
      Adam: "pNInz6obpgDQGcFmaJgB", // Multilingual male
      Charlotte: "XB0fDUnXU5powFXDhCwa",
    };
    const voiceId_resolved = VOICE_IDS[voiceId] || VOICE_IDS.Bella;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId_resolved}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn("ElevenLabs error:", response.status);
      return null;
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (err) {
    console.warn("ElevenLabs failed:", err.message);
    return null;
  }
}

async function openAITTSViaRouter(text, voice, apiKey) {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/audio/speech",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://laureatai.com",
          "X-Title": "Laureat AI",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini-tts",
          input: text,
          voice: voice || "nova",
          response_format: "mp3",
        }),
      }
    );

    if (!response.ok) {
      console.warn("OpenAI TTS via OpenRouter failed:", response.status);
      return null;
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (err) {
    console.warn("OpenAI TTS failed:", err.message);
    return null;
  }
}
