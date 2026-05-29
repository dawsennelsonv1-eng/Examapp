// api/diag-live.js
// Live API diagnostic. Visit /api/diag-live to see exactly why the call feature fails.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const results = {
    timestamp: new Date().toISOString(),
    version: "16.0.0",
    keyInfo: {},
    attempts: {},
  };

  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) {
    return res.status(200).json({ ...results, error: "GEMINI_API_KEY missing" });
  }

  results.keyInfo = {
    length: KEY.length,
    prefix: KEY.substring(0, 4),
    looksLikeAIza: KEY.startsWith("AIza"),
    looksLikeOAuth: KEY.startsWith("AQ.") || KEY.startsWith("ya29."),
  };

  // ATTEMPT 1: v1alpha auth_tokens:create (current endpoint)
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/auth_tokens:create?key=${KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uses: 1,
          expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
          liveConnectConstraints: {
            model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Achernar" } } },
            },
          },
        }),
      }
    );
    results.attempts.v1alpha_authTokens = {
      httpStatus: r.status,
      body: (await r.text()).substring(0, 500),
    };
  } catch (e) {
    results.attempts.v1alpha_authTokens = { exception: e.message };
  }

  // ATTEMPT 2: try with model name without "models/" prefix
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/auth_tokens:create?key=${KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uses: 1,
          expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
          liveConnectConstraints: {
            model: "gemini-2.5-flash-native-audio-preview-12-2025",
          },
        }),
      }
    );
    results.attempts.v1alpha_noPrefix = {
      httpStatus: r.status,
      body: (await r.text()).substring(0, 500),
    };
  } catch (e) {
    results.attempts.v1alpha_noPrefix = { exception: e.message };
  }

  // ATTEMPT 3: try gemini-live-2.5-flash-preview (another known Live model)
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/auth_tokens:create?key=${KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uses: 1,
          expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
          liveConnectConstraints: {
            model: "models/gemini-live-2.5-flash-preview",
          },
        }),
      }
    );
    results.attempts.v1alpha_liveFlashPreview = {
      httpStatus: r.status,
      body: (await r.text()).substring(0, 500),
    };
  } catch (e) {
    results.attempts.v1alpha_liveFlashPreview = { exception: e.message };
  }

  // ATTEMPT 4: check if v1beta is different
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/auth_tokens:create?key=${KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uses: 1 }),
      }
    );
    results.attempts.v1beta_authTokens = {
      httpStatus: r.status,
      body: (await r.text()).substring(0, 300),
    };
  } catch (e) {
    results.attempts.v1beta_authTokens = { exception: e.message };
  }

  // Summary
  const working = Object.entries(results.attempts).find(([k, v]) => v.httpStatus === 200);
  results.SUMMARY = {
    working_attempt: working ? working[0] : null,
    diagnosis: working
      ? `Use ${working[0]} approach. Token mints OK with that endpoint.`
      : "All attempts failed. Check errors. Likely cause: API key doesn't have Live API access, OR Live API isn't enabled for your project, OR the key is OAuth-style (AQ.) and needs different auth.",
  };

  return res.status(200).json(results);
}
