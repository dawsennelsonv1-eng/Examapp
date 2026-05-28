// api/tts.js
// v11: Gemini 3.1 Flash TTS primary (best ELO, 80+ languages incl Haitian Creole).
// ElevenLabs backup. Audio tags per persona for emotional control.

const PERSONA_VOICES = {
  joseph:     { gemini: "Achernar", style: "[calm][warm][slow] Tu parles avec sagesse et patience.", eleven: "VR6AewLTigWG4xSOukaG" },
  tikens:     { gemini: "Algenib",  style: "[energetic][youthful][upbeat] Tu parles avec énergie et enthousiasme.", eleven: "pNInz6obpgDQGcFmaJgB" },
  victoria:   { gemini: "Aoede",    style: "[elegant][confident][articulate] Tu parles avec sophistication.", eleven: "XB0fDUnXU5powFXDhCwa" },
  marckenson: { gemini: "Algieba",  style: "[intense][firm][direct] Tu parles avec autorité respectueuse.", eleven: "TxGEqnHWrfWFTfGW9XjX" },
  camille:    { gemini: "Vega",     style: "[gentle][supportive][warm] Tu parles avec douceur et encouragement.", eleven: "EXAVITQu4vr4xnSDxMaL" },
};

function detectLanguage(text) {
  // Heuristic: count Kreyòl-distinctive markers
  const kreyolMarkers = /\b(mwen|m'|nan|yo|kòm|fè|fò|w'|nou|li|sa|pa|gen|ka|ki|ye|sou|epi|tankou|paske|jodi|deja|toujou|pou)\b/gi;
  const matches = (text.match(kreyolMarkers) || []).length;
  const wordCount = text.split(/\s+/).length;
  // If >15% of words are Kreyòl-distinctive, treat as Kreyòl
  return matches / Math.max(wordCount, 1) > 0.15 ? "ht" : "fr";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text, persona = "joseph", isPremium = false } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text" });

    const cleanText = String(text).substring(0, 4000).trim();
    const voice = PERSONA_VOICES[persona] || PERSONA_VOICES.joseph;
    const lang = detectLanguage(cleanText);

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;

    // Primary: Gemini 3.1 Flash TTS
    if (GEMINI_KEY) {
      const audio = await geminiTTS(cleanText, voice.gemini, voice.style, lang, GEMINI_KEY);
      if (audio) {
        return res.status(200).json({
          data: {
            audioUrl: `data:audio/mp3;base64,${audio}`,
            backend: "gemini",
            modelUsed: "gemini-3.1-flash-tts",
            language: lang,
          },
        });
      }
    }

    // Backup: ElevenLabs
    if (ELEVEN_KEY) {
      const audio = await elevenLabsTTS(cleanText, voice.eleven, ELEVEN_KEY);
      if (audio) {
        return res.status(200).json({
          data: {
            audioUrl: `data:audio/mp3;base64,${audio}`,
            backend: "elevenlabs",
            modelUsed: "elevenlabs-v3",
            language: lang,
          },
        });
      }
    }

    // Last resort: browser TTS
    return res.status(200).json({
      data: { useBrowserFallback: true, text: cleanText, language: lang, modelUsed: "browser-fallback" },
    });
  } catch (err) {
    console.error("/api/tts error:", err);
    return res.status(200).json({
      data: { useBrowserFallback: true, text: req.body?.text || "", modelUsed: "browser-fallback" },
    });
  }
}

async function geminiTTS(text, voiceName, styleInstruction, lang, apiKey) {
  try {
    const promptedText = `${styleInstruction}\n\n${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptedText }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Gemini TTS error ${response.status}:`, errText.substring(0, 200));
      return null;
    }

    const data = await response.json();
    const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      console.warn("Gemini TTS returned no audio");
      return null;
    }
    return audioData; // base64 string
  } catch (err) {
    console.warn("Gemini TTS failed:", err.message);
    return null;
  }
}

async function elevenLabsTTS(text, voiceId, apiKey) {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
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
