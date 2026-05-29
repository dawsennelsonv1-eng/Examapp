// api/diag.js
// ALL-IN-ONE diagnostic. Visit:
//   /api/diag           → tests TTS + transcribe model (default)
//   /api/diag?test=live → tests Live API ephemeral token minting (8 combos)
//   /api/diag?test=all  → everything

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const test = (req.query?.test || "basic").toLowerCase();

  const results = {
    timestamp: new Date().toISOString(),
    version: "16.1.0",
    test,
    env: {},
  };

  results.env = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY
      ? `SET (${process.env.GEMINI_API_KEY.length} chars, starts ${process.env.GEMINI_API_KEY.substring(0, 4)})`
      : "MISSING",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "SET" : "MISSING",
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ? "SET" : "MISSING",
    ADMIN_SECRET: process.env.ADMIN_SECRET ? "SET" : "MISSING",
  };

  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) {
    return res.status(200).json({ ...results, error: "GEMINI_API_KEY missing" });
  }

  // BASIC tests: TTS + text model
  if (test === "basic" || test === "all") {
    results.gemini_tts = await testTTS(KEY);
    results.gemini_text = await testTextModel(KEY);
  }

  // LIVE tests: try multiple endpoint+model combos
  if (test === "live" || test === "all") {
    results.live_attempts = await testLiveCombos(KEY);
  }

  // SUMMARY
  results.SUMMARY = {
    tts_working: results.gemini_tts?.verdict?.includes("✅") || false,
    transcribe_model_working: results.gemini_text?.verdict?.includes("✅") || false,
    live_working_combo: results.live_attempts ? findWorkingLive(results.live_attempts) : null,
  };

  return res.status(200).json(results);
}

async function testTTS(KEY) {
  const out = {};
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Bonjou" }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
          },
        }),
      }
    );
    out.httpStatus = r.status;
    if (r.ok) {
      const data = await r.json();
      const inline = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      out.gotAudio = Boolean(inline?.data);
      out.mimeType = inline?.mimeType || "none";
      out.audioBytes = inline?.data ? inline.data.length : 0;
      out.verdict = inline?.data ? "✅ WORKING" : "❌ No audio in response";
    } else {
      out.error = (await r.text()).substring(0, 300);
      out.verdict = `❌ HTTP ${r.status}`;
    }
  } catch (err) {
    out.verdict = "❌ Exception";
    out.exception = err.message;
  }
  return out;
}

async function testTextModel(KEY) {
  const out = {};
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Say OK" }] }] }),
      }
    );
    out.httpStatus = r.status;
    if (r.ok) {
      out.verdict = "✅ WORKING (transcribe model available)";
    } else {
      out.error = (await r.text()).substring(0, 200);
      out.verdict = `❌ HTTP ${r.status}`;
    }
  } catch (err) {
    out.verdict = "❌ Exception";
    out.exception = err.message;
  }
  return out;
}

async function testLiveCombos(KEY) {
  const models = [
    "gemini-2.5-flash-native-audio-preview-12-2025",
    "gemini-live-2.5-flash-preview",
    "gemini-2.5-flash-preview-native-audio-dialog",
    "gemini-2.0-flash-live-001",
  ];
  const endpoints = [
    "https://generativelanguage.googleapis.com/v1alpha/auth_tokens:create",
    "https://generativelanguage.googleapis.com/v1beta/auth_tokens:create",
  ];

  const attempts = {};
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

  for (const endpoint of endpoints) {
    for (const model of models) {
      const key = `${endpoint.includes("v1alpha") ? "v1alpha" : "v1beta"}__${model}`;
      try {
        const r = await fetch(`${endpoint}?key=${KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uses: 1,
            expireTime,
            newSessionExpireTime,
            liveConnectConstraints: {
              model: `models/${model}`,
              config: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Achernar" } } },
              },
            },
          }),
        });
        attempts[key] = {
          status: r.status,
          ok: r.ok,
          body: (await r.text()).substring(0, 200),
        };
      } catch (e) {
        attempts[key] = { exception: e.message };
      }
    }
  }
  return attempts;
}

function findWorkingLive(attempts) {
  for (const [key, val] of Object.entries(attempts)) {
    if (val.ok) return key;
  }
  return null;
}
