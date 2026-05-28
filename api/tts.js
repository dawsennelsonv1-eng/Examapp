// api/tts.js
// v12 FIX: Gemini returns RAW PCM (16-bit, 24kHz, mono) — we must wrap it in a WAV
// header server-side, otherwise the browser can't play it. Was the silent failure.
// Also: correct MIME type (audio/wav), validated voice names, removed audio tags
// (they're for Live API, not generateContent TTS).

const PERSONA_VOICES = {
  // Each persona maps to a Gemini voice that matches their character.
  // Voice characteristics from Google docs:
  joseph:     { gemini: "Achernar", eleven: "VR6AewLTigWG4xSOukaG", style: "calmement, avec sagesse et patience" },
  tikens:     { gemini: "Puck",     eleven: "pNInz6obpgDQGcFmaJgB", style: "avec énergie et enthousiasme" },
  victoria:   { gemini: "Aoede",    eleven: "XB0fDUnXU5powFXDhCwa", style: "avec élégance et confiance" },
  marckenson: { gemini: "Charon",   eleven: "TxGEqnHWrfWFTfGW9XjX", style: "avec autorité et direction" },
  camille:    { gemini: "Leda",     eleven: "EXAVITQu4vr4xnSDxMaL", style: "avec douceur et encouragement" },
};

function detectLanguage(text) {
  const kreyolMarkers = /\b(mwen|m'|nan|yo|kòm|fè|fò|w'|nou|li|sa|pa|gen|ka|ki|ye|sou|epi|tankou|paske|jodi|deja|toujou|pou|eske|kounye|kounya|tande|gade)\b/gi;
  const matches = (text.match(kreyolMarkers) || []).length;
  const wordCount = text.split(/\s+/).length;
  return matches / Math.max(wordCount, 1) > 0.15 ? "ht" : "fr";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text, persona = "joseph" } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text" });

    const cleanText = String(text).substring(0, 4000).trim();
    const voice = PERSONA_VOICES[persona] || PERSONA_VOICES.joseph;
    const lang = detectLanguage(cleanText);

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;

    // PRIMARY: Gemini TTS
    if (GEMINI_KEY) {
      const result = await geminiTTS(cleanText, voice.gemini, voice.style, GEMINI_KEY);
      if (result) {
        return res.status(200).json({
          data: {
            audioUrl: `data:audio/wav;base64,${result.wavBase64}`,
            backend: "gemini",
            modelUsed: "gemini-3.1-flash-tts-preview",
            voice: voice.gemini,
            language: lang,
          },
        });
      }
      console.warn("Gemini TTS returned null — trying ElevenLabs");
    }

    // BACKUP: ElevenLabs
    if (ELEVEN_KEY) {
      const audio = await elevenLabsTTS(cleanText, voice.eleven, ELEVEN_KEY);
      if (audio) {
        return res.status(200).json({
          data: {
            audioUrl: `data:audio/mpeg;base64,${audio}`,
            backend: "elevenlabs",
            modelUsed: "elevenlabs-multilingual-v2",
            language: lang,
          },
        });
      }
      console.warn("ElevenLabs returned null");
    }

    // Last resort: browser fallback
    return res.status(200).json({
      data: { useBrowserFallback: true, text: cleanText, language: lang, modelUsed: "browser-fallback" },
    });
  } catch (err) {
    console.error("/api/tts fatal error:", err);
    return res.status(200).json({
      data: { useBrowserFallback: true, text: req.body?.text || "", modelUsed: "browser-fallback", error: err.message },
    });
  }
}

async function geminiTTS(text, voiceName, styleHint, apiKey) {
  try {
    // Style hint guides Gemini's prosody (not audio tags — those are Live API only)
    const promptedText = styleHint ? `Dis ce qui suit ${styleHint}: ${text}` : text;

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
      console.error(`Gemini TTS HTTP ${response.status}:`, errText.substring(0, 400));
      return null;
    }

    const data = await response.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) {
      console.warn("Gemini TTS: no inlineData in response");
      return null;
    }

    // inlineData.data is base64-encoded RAW PCM (audio/L16;codec=pcm;rate=24000)
    // We need to wrap it in a WAV header so browsers can play it
    const pcmBuffer = Buffer.from(inlineData.data, "base64");

    // Parse sample rate from MIME if present, else default
    let sampleRate = 24000;
    const mimeMatch = (inlineData.mimeType || "").match(/rate=(\d+)/);
    if (mimeMatch) sampleRate = parseInt(mimeMatch[1], 10);

    const wavBuffer = pcmToWav(pcmBuffer, sampleRate, 1, 16);
    return { wavBase64: wavBuffer.toString("base64") };
  } catch (err) {
    console.error("Gemini TTS exception:", err.message);
    return null;
  }
}

/**
 * Wrap raw 16-bit PCM in a proper WAV header.
 * sampleRate: sample rate in Hz (24000 for Gemini)
 * numChannels: 1 (mono)
 * bitsPerSample: 16
 */
function pcmToWav(pcmBuffer, sampleRate, numChannels, bitsPerSample) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const fileSize = 44 + dataSize - 8;

  const header = Buffer.alloc(44);
  let offset = 0;

  header.write("RIFF", offset);             offset += 4;
  header.writeUInt32LE(fileSize, offset);   offset += 4;
  header.write("WAVE", offset);             offset += 4;
  header.write("fmt ", offset);             offset += 4;
  header.writeUInt32LE(16, offset);         offset += 4; // PCM chunk size
  header.writeUInt16LE(1, offset);          offset += 2; // PCM format
  header.writeUInt16LE(numChannels, offset);offset += 2;
  header.writeUInt32LE(sampleRate, offset); offset += 4;
  header.writeUInt32LE(byteRate, offset);   offset += 4;
  header.writeUInt16LE(blockAlign, offset); offset += 2;
  header.writeUInt16LE(bitsPerSample, offset); offset += 2;
  header.write("data", offset);             offset += 4;
  header.writeUInt32LE(dataSize, offset);

  return Buffer.concat([header, pcmBuffer]);
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
      const errText = await response.text();
      console.warn(`ElevenLabs HTTP ${response.status}:`, errText.substring(0, 200));
      return null;
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (err) {
    console.warn("ElevenLabs exception:", err.message);
    return null;
  }
}
