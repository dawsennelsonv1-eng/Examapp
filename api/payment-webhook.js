// api/payment-webhook.js
// v8: Uses Vercel KV for persistent transaction storage.
// Falls back to in-memory if KV not configured.

import { kv } from "@vercel/kv";

const inMemoryStore = new Map();

const hasKV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function storeTx(txId, txData) {
  if (hasKV) {
    await kv.set(`tx:${txId}`, txData, { ex: 60 * 60 * 24 * 90 }); // 90 days
    // Also append to recent list for admin view
    await kv.lpush("tx:recent", JSON.stringify({ ...txData, txId }));
    await kv.ltrim("tx:recent", 0, 999); // keep last 1000
  } else {
    inMemoryStore.set(txId, txData);
  }
}

async function getTx(txId) {
  if (hasKV) {
    return await kv.get(`tx:${txId}`);
  }
  return inMemoryStore.get(txId);
}

async function markTxUsed(txId, txData) {
  if (hasKV) {
    await kv.set(`tx:${txId}`, txData, { ex: 60 * 60 * 24 * 90 });
  } else {
    inMemoryStore.set(txId, txData);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Secret");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const { txId } = req.query;
    if (!txId) return res.status(400).json({ error: "Missing txId" });

    const tx = await getTx(txId);
    if (!tx) return res.status(404).json({ error: "Transaction non trouvée" });
    if (tx.used) return res.status(409).json({ error: "Transaction déjà utilisée" });

    tx.used = true;
    tx.usedAt = Date.now();
    await markTxUsed(txId, tx);

    // Track for analytics
    if (hasKV) {
      await kv.incr("metrics:total_paid_signups");
      await kv.incr(`metrics:plan_${tx.plan}_count`);
      await kv.incrby("metrics:total_revenue_htg", tx.amount || 0);
    }

    return res.status(200).json({
      data: {
        txId, amount: tx.amount, currency: tx.currency,
        plan: tx.plan, sender: tx.sender, receivedAt: tx.receivedAt,
      },
    });
  }

  if (req.method === "POST") {
    const secret = req.headers["x-webhook-secret"];
    const WEBHOOK_SECRET = process.env.SMS_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { smsBody, sender } = req.body || {};
      if (!smsBody) return res.status(400).json({ error: "Missing smsBody" });

      const parsed = parseSmsTransaction(smsBody, sender);
      if (!parsed) return res.status(400).json({ error: "Could not parse SMS" });

      let plan = null;
      if (parsed.amount === 750 || parsed.amount === 900) plan = "basic";
      else if (parsed.amount === 1200 || parsed.amount === 1450) plan = "premium";
      else {
        // Still store the tx for manual review but don't auto-validate
        await storeTx(parsed.txId, {
          ...parsed, plan: null, receivedAt: Date.now(), used: false, needsReview: true,
        });
        return res.status(200).json({ warning: "Amount doesn't match any plan", parsed });
      }

      await storeTx(parsed.txId, {
        ...parsed, plan, receivedAt: Date.now(), used: false,
      });

      return res.status(200).json({ success: true, txId: parsed.txId, plan });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

function parseSmsTransaction(smsBody, sender) {
  const text = smsBody.replace(/\s+/g, " ").trim();

  const amountMatch =
    text.match(/(\d+(?:[.,]\d+)?)\s*HTG/i) ||
    text.match(/HTG\s*(\d+(?:[.,]\d+)?)/i) ||
    text.match(/(\d+(?:[.,]\d+)?)\s*gd/i) ||
    text.match(/montan[t]?\s*[:\s]+(\d+(?:[.,]\d+)?)/i);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(",", "."));

  const txIdMatch =
    text.match(/(?:Transaksyon|Transaction|ID|Ref|Reference|Code)[:\s#]+([A-Z0-9]{6,})/i) ||
    text.match(/\b([A-Z0-9]{8,})\b/);
  if (!txIdMatch) return null;
  const txId = txIdMatch[1].toUpperCase();

  const senderMatch = text.match(/(?:nan men|de la part de|from|de|by)\s+([A-Z][a-zA-ZÀ-ÿ\s]+?)(?:\.|,|\d|ID|Transaction|Ref)/i);
  const senderName = senderMatch ? senderMatch[1].trim() : sender || null;

  return { txId, amount, currency: "HTG", sender: senderName, rawSms: smsBody };
}
