// api/diag.js v18
// CRITICAL FIX: uses the REAL Live model names per official docs (April 2026):
//   - gemini-3.1-flash-live-preview  ← the canonical one
//   - gemini-live-2.5-flash-preview
// My previous candidate list ("native-audio-preview-12-2025" etc.) was wrong
// — those models don't exist, which caused 404s on token creation.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const test = (req.query?.test || "basic").toLowerCase();

  const results = {
    timestamp: new Date().toISOString(),
    version: "18.0.0",
    test,
    env: {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
        ? `SET (${process.env.GEMINI_API_KEY.length} chars, starts ${process.env.GEMINI_API_KEY.substring(0, 4)})`
        : "MISSING",
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "SET" : "MISSING",
      ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ? "SET" : "MISSING",
    },
  };

  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) return res.status(200).json({ ...results, error: "GEMINI_API_KEY missing" });

  if (test === "basic" || test === "all") {
    results.gemini_tts = await testTTS(KEY);
    results.gemini_text = await testTextModel(KEY);
  }

  if (test === "live" || test === "all") {
    results.live_attempts = await testLiveCombos(KEY);
    results.live_models_listing = await listLiveModels(KEY);
  }

  results.SUMMARY = {
    tts_working: results.gemini_tts?.verdict?.includes("✅") || false,
    transcribe_working: results.gemini_text?.verdict?.includes("✅") || false,
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
    out.verdict = r.ok ? "✅ WORKING" : `❌ HTTP ${r.status}`;
    if (!r.ok) out.error = (await r.text()).substring(0, 200);
  } catch (err) {
    out.verdict = "❌ Exception";
    out.exception = err.message;
  }
  return out;
}

// CORRECT Live model names per official Google docs (April 2026)
const LIVE_MODELS = [
  "gemini-3.1-flash-live-preview",       // primary, per docs
  "gemini-live-2.5-flash-preview",        // 2.5 generation
  "gemini-2.0-flash-live-001",            // 2.0 generation, GA
];

async function testLiveCombos(KEY) {
  const attempts = {};
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

  // Try v1alpha auth_tokens:create (the documented endpoint)
  for (const model of LIVE_MODELS) {
    const key = `v1alpha__${model}`;
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1alpha/auth_tokens:create?key=${KEY}`,
        {
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
              },
            },
          }),
        }
      );
      attempts[key] = {
        status: r.status,
        ok: r.ok,
        body: (await r.text()).substring(0, 300),
      };
    } catch (e) {
      attempts[key] = { exception: e.message };
    }
  }

  return attempts;
}

// Bonus: list what Live models the key can actually access
async function listLiveModels(KEY) {
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}&pageSize=100`
    );
    if (!r.ok) return { error: `HTTP ${r.status}` };
    const data = await r.json();
    const liveModels = (data.models || [])
      .filter((m) => /live|bidi|audio/i.test(m.name || ""))
      .map((m) => ({
        name: m.name,
        displayName: m.displayName,
        supportedMethods: m.supportedGenerationMethods,
      }));
    return { availableLiveModels: liveModels };
  } catch (err) {
    return { exception: err.message };
  }
}

function findWorkingLive(attempts) {
  for (const [key, val] of Object.entries(attempts)) {
    if (val.ok) return key;
  }
  return null;
}
