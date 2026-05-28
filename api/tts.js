// api/tts.js
// v14: Optimized for SPEED. Frontend now calls this per-sentence so first audio
// plays in ~2s instead of waiting 10s for the whole message.
// Each call synthesizes ONE short chunk. Returns WAV.

const PERSONA_VOICES = {
  joseph:     { gemini: "Achernar", eleven: "VR6AewLTigWG4xSOukaG" },
  tikens:     { gemini: "Puck",     eleven: "pNInz6obpgDQGcFmaJgB" },
  victoria:   { gemini: "Aoede",    eleven: "XB0fDUnXU5powFXDhCwa" },
  marckenson: { gemini: "Charon",   eleven: "TxGEqnHWrfWFTfGW9XjX" },
  camille:    { gemini: "Leda",     eleven: "EXAVITQu4vr4xnSDxMaL" },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text, persona = "joseph" } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text" });

    // Keep chunks short for speed. Frontend should send one sentence at a time,
    // but we cap here as a safety net.
    const cleanText = String(text).substring(0, 800).trim();
    const voice = PERSONA_VOICES[persona] || PERSONA_VOICES.joseph;

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;

    if (GEMINI_KEY) {
      const result = await geminiTTS(cleanText, voice.gemini, GEMINI_KEY);
      if (result) {
        return res.status(200).json({
          data: {
            audioUrl: `data:audio/wav;base64,${result.wavBase64}`,
            backend: "gemini",
            modelUsed: "gemini-3.1-flash-tts-preview",
          },
        });
      }
    }

    if (ELEVEN_KEY) {
      const audio = await elevenLabsTTS(cleanText, voice.eleven, ELEVEN_KEY);
      if (audio) {
        return res.status(200).json({
          data: {
            audioUrl: `data:audio/mpeg;base64,${audio}`,
            backend: "elevenlabs",
            modelUsed: "elevenlabs-multilingual-v2",
          },
        });
      }
    }

    return res.status(200).json({
      data: { useBrowserFallback: true, text: cleanText, modelUsed: "browser-fallback" },
    });
  } catch (err) {
    console.error("/api/tts fatal:", err);
    return res.status(200).json({
      data: { useBrowserFallback: true, text: req.body?.text || "", modelUsed: "browser-fallback" },
    });
  }
}

async function geminiTTS(text, voiceName, apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini TTS HTTP ${response.status}:`, errText.substring(0, 300));
      return null;
    }

    const data = await response.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) return null;

    const pcmBuffer = Buffer.from(inlineData.data, "base64");
    let sampleRate = 24000;
    const m = (inlineData.mimeType || "").match(/rate=(\d+)/);
    if (m) sampleRate = parseInt(m[1], 10);

    const wavBuffer = pcmToWav(pcmBuffer, sampleRate, 1, 16);
    return { wavBase64: wavBuffer.toString("base64") };
  } catch (err) {
    console.error("Gemini TTS exception:", err.message);
    return null;
  }
}

function pcmToWav(pcmBuffer, sampleRate, numChannels, bitsPerSample) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  let o = 0;
  header.write("RIFF", o); o += 4;
  header.writeUInt32LE(36 + dataSize, o); o += 4;
  header.write("WAVE", o); o += 4;
  header.write("fmt ", o); o += 4;
  header.writeUInt32LE(16, o); o += 4;
  header.writeUInt16LE(1, o); o += 2;
  header.writeUInt16LE(numChannels, o); o += 2;
  header.writeUInt32LE(sampleRate, o); o += 4;
  header.writeUInt32LE(byteRate, o); o += 4;
  header.writeUInt16LE(blockAlign, o); o += 2;
  header.writeUInt16LE(bitsPerSample, o); o += 2;
  header.write("data", o); o += 4;
  header.writeUInt32LE(dataSize, o);
  return Buffer.concat([header, pcmBuffer]);
}

async function elevenLabsTTS(text, voiceId, apiKey) {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey, Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}
