// api/brain.js v20
// MULTI-AI ROUTING. Different models specialize in different tasks.
//
// ARCHITECTURE:
//   Decision (what to do next, when to show board, suggested actions) → Claude Opus 4.7
//   Chat (conversational replies, tutoring) → Gemini 3 Pro
//   Board (SVG diagrams, structured content) → Claude Opus 4.7
//   OCR / scan extraction → Gemini 3.5 Flash Lite (fast + cheap)
//   Solve (math reasoning) → GPT-5.5 (best math)
//   Verify (evaluate student work) → Claude Opus 4.7 (best critical analysis)
//
// One unified router: callBrain({ task, ... }) → returns the right answer.

const TASK_MODELS = {
  decision: ["anthropic/claude-opus-4.7", "google/gemini-3-pro-preview"],
  chat:     ["google/gemini-3-pro-preview", "anthropic/claude-opus-4.7", "openai/gpt-5.5"],
  board:    ["anthropic/claude-opus-4.7", "openai/gpt-5.5"],
  ocr:      ["google/gemini-3.5-flash-lite", "google/gemini-3-flash-preview"],
  solve:    ["openai/gpt-5.5", "anthropic/claude-opus-4.7", "google/gemini-3.1-pro"],
  verify:   ["anthropic/claude-opus-4.7", "openai/gpt-5.5"],
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { task, prompt, messages, jsonMode = true, temperature = 0.4, maxTokens = 2000, imageData = null } = req.body || {};
    if (!task || !TASK_MODELS[task]) {
      return res.status(400).json({ error: `Unknown task. Valid: ${Object.keys(TASK_MODELS).join(", ")}` });
    }

    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "OpenRouter key missing" });

    const candidates = TASK_MODELS[task];

    // Build content (text or text + image)
    let userContent;
    if (imageData) {
      userContent = [
        { type: "text", text: prompt || "" },
        { type: "image_url", image_url: { url: imageData } },
      ];
    } else {
      userContent = prompt;
    }

    const apiMessages = Array.isArray(messages) && messages.length
      ? messages
      : [{ role: "user", content: userContent }];

    let result = null;
    let modelUsed = null;
    let lastError = null;

    for (const model of candidates) {
      try {
        const body = {
          model,
          messages: apiMessages,
          max_tokens: maxTokens,
          temperature,
        };
        if (jsonMode) body.response_format = { type: "json_object" };

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${KEY}`,
            "HTTP-Referer": "https://laureatai.com",
            "X-Title": "Laureat AI Brain",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          lastError = `${model}: HTTP ${response.status}`;
          continue;
        }

        const data = await response.json();
        const raw = data?.choices?.[0]?.message?.content;
        if (!raw) { lastError = `${model}: empty response`; continue; }

        if (jsonMode) {
          try {
            const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
            result = JSON.parse(cleaned);
            modelUsed = model;
            break;
          } catch {
            lastError = `${model}: JSON parse failed`;
            continue;
          }
        } else {
          result = { text: raw };
          modelUsed = model;
          break;
        }
      } catch (err) {
        lastError = `${model}: ${err.message}`;
        continue;
      }
    }

    if (!result) {
      return res.status(502).json({ error: "All models failed", lastError });
    }

    return res.status(200).json({
      data: result,
      meta: { task, modelUsed, candidates },
    });
  } catch (err) {
    console.error("/api/brain error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
