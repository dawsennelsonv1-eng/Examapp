// api/diag.js
// DIAGNOSTIC endpoint. Visit /api/diag in your browser to see EXACTLY what's
// working and what's failing. No more guessing.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const results = {
    timestamp: new Date().toISOString(),
    version: "15.0.0",
    env: {},
    gemini_tts: {},
    gemini_text: {},
    openrouter: {},
  };

  // 1. Check which env vars exist (without exposing values)
  results.env = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `SET (${process.env.GEMINI_API_KEY.length} chars, starts ${process.env.GEMINI_API_KEY.substring(0, 4)})` : "MISSING",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "SET" : "MISSING",
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ? "SET" : "MISSING",
    ADMIN_SECRET: process.env.ADMIN_SECRET ? "SET" : "MISSING",
  };

  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  // 2. Test Gemini TTS with a tiny phrase
  if (GEMINI_KEY) {
    try {
      const ttsResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${GEMINI_KEY}`,
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
      results.gemini_tts.httpStatus = ttsResp.status;
      if (ttsResp.ok) {
        const data = await ttsResp.json();
        const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        results.gemini_tts.gotAudio = Boolean(inlineData?.data);
        results.gemini_tts.mimeType = inlineData?.mimeType || "none";
        results.gemini_tts.audioBytes = inlineData?.data ? inlineData.data.length : 0;
        results.gemini_tts.verdict = inlineData?.data ? "✅ WORKING" : "❌ No audio in response";
        if (!inlineData?.data) {
          results.gemini_tts.rawResponse = JSON.stringify(data).substring(0, 500);
        }
      } else {
        const errText = await ttsResp.text();
        results.gemini_tts.error = errText.substring(0, 500);
        results.gemini_tts.verdict = `❌ HTTP ${ttsResp.status}`;
      }
    } catch (err) {
      results.gemini_tts.verdict = "❌ Exception";
      results.gemini_tts.exception = err.message;
    }

    // 3. Test Gemini text model (for transcribe — uses gemini-3.5-flash)
    try {
      const txtResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Say OK" }] }],
          }),
        }
      );
      results.gemini_text.httpStatus = txtResp.status;
      if (txtResp.ok) {
        results.gemini_text.verdict = "✅ WORKING (transcribe model available)";
      } else {
        const errText = await txtResp.text();
        results.gemini_text.error = errText.substring(0, 300);
        results.gemini_text.verdict = `❌ HTTP ${txtResp.status} — transcribe model may not exist`;
      }
    } catch (err) {
      results.gemini_text.verdict = "❌ Exception";
      results.gemini_text.exception = err.message;
    }
  } else {
    results.gemini_tts.verdict = "❌ SKIPPED — no GEMINI_API_KEY";
    results.gemini_text.verdict = "❌ SKIPPED — no GEMINI_API_KEY";
  }

  // Summary
  results.SUMMARY = {
    tts_working: results.gemini_tts.verdict?.includes("✅") || false,
    transcribe_model_working: results.gemini_text.verdict?.includes("✅") || false,
    most_likely_problem: !GEMINI_KEY
      ? "GEMINI_API_KEY is not set in Vercel"
      : results.gemini_tts.verdict?.includes("403")
      ? "Your API key doesn't have TTS access — enable it in AI Studio or the key is restricted"
      : results.gemini_tts.verdict?.includes("404")
      ? "Model gemini-3.1-flash-tts-preview not available to your key — may need different model name"
      : results.gemini_tts.verdict?.includes("✅")
      ? "TTS API works! If audio still sounds bad, the problem is in the frontend audio playback"
      : "Unknown — check gemini_tts.error above",
  };

  return res.status(200).json(results);
}
