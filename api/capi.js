// api/capi.js — Meta Conversions API (server side), paired with the browser Pixel.
// The browser fires the Pixel event; this fires the same event (same event_id)
// from the server so Meta deduplicates and ad-blockers/iOS don't lose it.
// PII (email/phone) is SHA-256 hashed here — never sent raw to Meta.
//
// Env (set in Vercel):
//   VITE_META_PIXEL_ID   (also used by the browser pixel)
//   META_ACCESS_TOKEN    (server only — never exposed to the browser)

import crypto from "crypto";

const sha256 = (v) =>
  v ? crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex") : undefined;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const pixelId = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  // If Meta isn't configured yet, succeed silently so the app never errors.
  if (!pixelId || !accessToken) return res.status(200).json({ skipped: true, reason: "meta_not_configured" });

  try {
    const { eventName, eventId, url, email, phone, value, currency } = req.body || {};
    const clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || undefined;
    const clientUserAgent = req.headers["user-agent"] || undefined;

    const user_data = {
      em: email ? [sha256(email)] : undefined,
      ph: phone ? [sha256(phone)] : undefined,
      client_ip_address: clientIp,
      client_user_agent: clientUserAgent,
    };
    const custom_data = value != null ? { value: Number(value), currency: currency || "HTG" } : undefined;

    const payload = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,            // <-- shared with the browser pixel → dedup
        event_source_url: url,
        action_source: "website",
        user_data,
        custom_data,
      }],
    };
    // Set META_TEST_EVENT_CODE in Vercel to make server events appear in
    // Events Manager → Test Events. REMOVE it for production.
    if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

    const r = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    const result = await r.json();
    return res.status(200).json({ ok: r.ok, result });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}
