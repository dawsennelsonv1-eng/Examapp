// api/payment-webhook.js
// Receives MonCash/NatCash SMS via SMS Forwarder app on the owner's phone.
// Parses the transaction ID + amount, stores it, user later enters the txID in /paywall.

const transactionStore = new Map();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Secret");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const { txId } = req.query;
    if (!txId) return res.status(400).json({ error: "Missing txId" });

    const tx = transactionStore.get(txId);
    if (!tx) return res.status(404).json({ error: "Transaction non trouvée" });
    if (tx.used) return res.status(409).json({ error: "Transaction déjà utilisée" });

    tx.used = true;
    tx.usedAt = Date.now();
    transactionStore.set(txId, tx);

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
      if (parsed.amount === 900) plan = "basic";
      else if (parsed.amount === 2400) plan = "premium";
      else {
        return res.status(200).json({ warning: "Amount doesn't match any plan", parsed });
      }

      transactionStore.set(parsed.txId, {
        ...parsed, plan, receivedAt: Date.now(), used: false,
      });

      return res.status(200).json({ success: true, txId: parsed.txId, plan });
    } catch (err) {
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
    text.match(/(\d+(?:[.,]\d+)?)\s*gd/i);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(",", "."));

  const txIdMatch =
    text.match(/(?:Transaksyon|Transaction|ID|Ref)[:\s#]+([A-Z0-9]{6,})/i) ||
    text.match(/\b([A-Z0-9]{8,})\b/);
  if (!txIdMatch) return null;
  const txId = txIdMatch[1].toUpperCase();

  const senderMatch = text.match(/(?:nan men|de la part de|from|de)\s+([A-Z][a-zA-ZÀ-ÿ\s]+?)(?:\.|,|\d|ID|Transaction)/i);
  const senderName = senderMatch ? senderMatch[1].trim() : sender || null;

  return { txId, amount, currency: "HTG", sender: senderName, rawSms: smsBody };
}
