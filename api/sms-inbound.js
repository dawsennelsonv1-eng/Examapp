// api/sms-inbound.js — receives forwarded payment SMS and stores parsed rows.
//
// Point your Android SMS-forwarder app (e.g. "SMS Forwarder" / "SMS to URL
// Forwarder") at:
//     POST https://<your-app>/api/sms-inbound?token=<SMS_INBOUND_TOKEN>
//     body (JSON):  { "from": "<sender>", "text": "<full sms body>" }
//   or form/text body — we read several common field names.
//
// Security: a shared secret in the query (?token=) must match SMS_INBOUND_TOKEN
// (Vercel env var). Without it the request is rejected. This is light protection
// appropriate for a forwarder that can't do OAuth.
//
// Env vars:
//   SMS_INBOUND_TOKEN          = <a long random string you choose>
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (see _supabaseAdmin.js)

import { getSupabaseAdmin } from "./_supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.query?.token || req.headers["x-sms-token"];
  if (!process.env.SMS_INBOUND_TOKEN || token !== process.env.SMS_INBOUND_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return res.status(500).json({ error: "server not configured" });

  // Accept a few shapes: JSON {text|message|body}, or raw string body.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = { text: body }; }
  }
  const text = body?.text || body?.message || body?.body || body?.msg || "";
  const from = body?.from || body?.sender || body?.number || null;
  if (!text) return res.status(400).json({ error: "no text" });

  const parsed = parsePaymentSMS(text);
  if (!parsed) {
    // Not a payment SMS we recognize — store nothing, ack so the forwarder stops.
    return res.status(200).json({ ok: true, parsed: false });
  }

  try {
    const { error } = await admin.from("payment_sms").upsert({
      method: parsed.method,
      transaction_id: parsed.transactionId,
      amount: parsed.amount,
      sender: from || parsed.sender || null,
      raw_text: text,
    }, { onConflict: "method,transaction_id", ignoreDuplicates: true });
    if (error) console.warn("sms-inbound insert:", error.message);
    return res.status(200).json({ ok: true, parsed: true, method: parsed.method });
  } catch (err) {
    console.error("sms-inbound error:", err);
    return res.status(500).json({ error: "store failed" });
  }
}

// Parse a MonCash / NatCash confirmation SMS. These formats vary; we look for a
// transaction id and an amount in HTG. Tune the regexes to your real SMS text.
export function parsePaymentSMS(text) {
  const t = String(text);
  const lower = t.toLowerCase();

  let method = null;
  if (lower.includes("moncash") || lower.includes("mon cash")) method = "moncash";
  else if (lower.includes("natcash") || lower.includes("nat cash")) method = "natcash";

  // Transaction id: common labels, else a long alphanumeric token.
  let transactionId = null;
  const idLabeled = t.match(/(?:transaction|trans|ref(?:erence)?|id|kòd|code)[^A-Za-z0-9]{0,4}([A-Za-z0-9]{6,})/i);
  if (idLabeled) transactionId = idLabeled[1];
  if (!transactionId) {
    const token = t.match(/\b([A-Z0-9]{8,})\b/);
    if (token) transactionId = token[1];
  }

  // Amount in HTG / gourdes.
  let amount = null;
  const amt = t.match(/(\d[\d\s.,]{1,12})\s*(?:htg|gdes?|gourdes?|g\b)/i)
           || t.match(/(?:htg|gdes?|gourdes?)\s*(\d[\d\s.,]{1,12})/i);
  if (amt) {
    const num = amt[1].replace(/[\s,](?=\d{3}\b)/g, "").replace(",", ".").replace(/\s/g, "");
    const parsedNum = parseFloat(num);
    if (!Number.isNaN(parsedNum)) amount = parsedNum;
  }

  if (!method || !transactionId) return null;
  return { method, transactionId, amount, sender: null };
}
