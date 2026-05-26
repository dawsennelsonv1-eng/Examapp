// api/config.js
// GET: Returns public config (payment numbers, etc).
// POST: Admin updates config (requires X-Admin-Token).
// Stored in Vercel KV.

import { kv } from "@vercel/kv";

const hasKV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const DEFAULT_CONFIG = {
  paymentConfig: {
    moncash: { number: "+509 3731-8656", name: "Brunelley A Nelson" },
    natcash: { number: "+509 4151-8331", name: "Brunelley A Nelson" },
  },
  modelStack: {
    ocr: { free: "google/gemini-3.5-flash-lite", premium: "google/gemini-3.1-pro" },
    solve: { free: "google/gemini-3-pro-preview", premium: "openai/gpt-5.5" },
    chat: { free: "google/gemini-3.5-flash", premium: "google/gemini-3-pro-preview" },
    board: { free: "anthropic/claude-opus-4.7", premium: "anthropic/claude-opus-4.7" },
    tts: { free: "openai/gpt-4o-mini-tts", premium: "fish-audio-s2" },
  },
};

async function getConfig() {
  if (hasKV) {
    const stored = await kv.get("app:config");
    return { ...DEFAULT_CONFIG, ...(stored || {}) };
  }
  return DEFAULT_CONFIG;
}

async function setConfig(config) {
  if (hasKV) {
    await kv.set("app:config", config);
  }
  return config;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const config = await getConfig();
    // Return public-safe config (payment numbers are public-ish for paywall page)
    return res.status(200).json({ data: config });
  }

  if (req.method === "POST") {
    const adminToken = req.headers["x-admin-token"];
    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (!ADMIN_SECRET || adminToken !== ADMIN_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const newConfig = req.body || {};
      const current = await getConfig();
      const merged = { ...current, ...newConfig };
      await setConfig(merged);
      return res.status(200).json({ data: merged, saved: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to save config" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
