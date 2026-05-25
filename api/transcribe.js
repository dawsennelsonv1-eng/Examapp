// api/transcribe.js
// Voice input: student records audio, we transcribe with Whisper.
// Handles French + Haitian Creole.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { audioData, language } = req.body || {};
    if (!audioData) return res.status(400).json({ error: "Missing audio data" });

    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    // Decode base64 audio
    const base64 = audioData.replace(/^data:audio\/\w+;base64,/, "");
    const audioBuffer = Buffer.from(base64, "base64");

    // Create multipart form data
    const boundary = `----WebKitFormBoundary${Math.random().toString(36).slice(2)}`;
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="file"; filename="audio.webm"\r\n`),
      Buffer.from(`Content-Type: audio/webm\r\n\r\n`),
      audioBuffer,
      Buffer.from(`\r\n--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="model"\r\n\r\n`),
      Buffer.from(`openai/whisper-large-v3\r\n`),
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="language"\r\n\r\n`),
      Buffer.from(`${language || "fr"}\r\n`),
      Buffer.from(`--${boundary}--\r\n`),
    ]);

    const response = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "HTTP-Referer": "https://laureatai.com",
        "X-Title": "Laureat AI",
      },
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Whisper error:", response.status, errText);
      return res.status(502).json({ error: "Transcription failed" });
    }

    const data = await response.json();

    return res.status(200).json({
      data: {
        text: data.text || "",
        language: data.language || "fr",
        modelUsed: "openai/whisper-large-v3",
      },
    });
  } catch (err) {
    console.error("/api/transcribe error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
