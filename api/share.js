// api/share.js — v24
// POST: create shareable session (returns shareId)
// GET: retrieve shared session by shareId
//
// FIX (Bug 3): @vercel/kv is imported LAZILY. A top-level
// `import { kv } from "@vercel/kv"` crashes the whole serverless function on
// cold start if the package isn't installed, which made every share fail
// silently. Now we try to load it at request time and fall back to an
// in-memory store if it's unavailable.

const memStore = new Map();

async function getKV() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try {
    const mod = await import("@vercel/kv");
    return mod.kv || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    try {
      const { type, payload } = req.body || {};
      if (!type || !payload) return res.status(400).json({ error: "Missing type or payload" });

      const shareId = `${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const data = { type, payload, createdAt: Date.now(), views: 0 };

      const kv = await getKV();
      if (kv) {
        await kv.set(`share:${shareId}`, data, { ex: 60 * 60 * 24 * 30 }); // 30 days
        await kv.incr("metrics:total_shares");
      } else {
        memStore.set(shareId, data);
      }

      return res.status(200).json({ data: { shareId, url: `/share/${shareId}` } });
    } catch (err) {
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "GET") {
    const { shareId } = req.query;
    if (!shareId) return res.status(400).json({ error: "Missing shareId" });

    try {
      let data;
      const kv = await getKV();
      if (kv) {
        data = await kv.get(`share:${shareId}`);
        if (data) {
          await kv.incr(`share:${shareId}:views`);
          await kv.incr("metrics:total_share_views");
        }
      } else {
        data = memStore.get(shareId);
      }

      if (!data) return res.status(404).json({ error: "Share not found or expired" });
      return res.status(200).json({ data });
    } catch (err) {
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
