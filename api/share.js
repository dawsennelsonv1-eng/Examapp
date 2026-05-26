// api/share.js
// POST: create shareable session (returns shareId)
// GET: retrieve shared session by shareId

import { kv } from "@vercel/kv";

const hasKV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const memStore = new Map();

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

      if (hasKV) {
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
      if (hasKV) {
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
