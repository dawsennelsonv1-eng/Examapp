// api/payment-webhook.js
// Receives MonCash/NatCash SMS via SMS forwarder app.
// Parses transaction ID, validates amount, grants user access.
//
// Setup: install "SMS Forwarder" app on your phone (the one receiving MonCash/NatCash SMS).
// Configure it to forward all SMS from MonCash/NatCash to this webhook URL.
// The webhook extracts the transaction ID and amount, then user enters it in the app.
//
// Storage: Vercel KV recommended for production. For MVP we use a simple Map + localStorage on client.

// In-memory store (resets on cold start). Replace with Vercel KV for production.
const transactionStore = new Map();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Secret");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET = client validating a transaction ID
  if (req.method === "GET") {
    const { txId } = req.query;
    if (!txId) return res.status(400).json({ error: "Missing txId" });

    const tx = transactionStore.get(txId);
    if (!tx) {
      return res.status(404).json({ error: "Transaction non trouvée" });
    }
    if (tx.used) {
      return res.status(409).json({ error: "Transaction déjà utilisée" });
    }

    // Mark as used and return plan info
    tx.used = true;
    tx.usedAt = Date.now();
    transactionStore.set(txId, tx);

    return res.status(200).json({
      data: {
        txId,
        amount: tx.amount,
        currency: tx.currency,
        plan: tx.plan,
        sender: tx.sender,
        receivedAt: tx.receivedAt,
      },
    });
  }

  // POST = SMS forwarder sending us a new transaction
  if (req.method === "POST") {
    // Verify webhook secret to prevent abuse
    const secret = req.headers["x-webhook-secret"];
    const WEBHOOK_SECRET = process.env.SMS_WEBHOOK_SECRET || "laureat-sms-2026";
    if (secret !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { smsBody, sender } = req.body || {};
      if (!smsBody) return res.status(400).json({ error: "Missing smsBody" });

      // Parse MonCash SMS format
      // Example: "Ou resevwa 900.00 HTG nan men Jean Dupont. ID Transaksyon: 12345678. Solde: 900.00 HTG."
      // Example: "Vous avez reçu 2400 HTG. Transaction ID: ABC123XYZ"
      const parsed = parseSmsTransaction(smsBody, sender);
      if (!parsed) {
        console.warn("Could not parse SMS:", smsBody);
        return res.status(400).json({ error: "Could not parse SMS" });
      }

      // Determine plan from amount
      let plan = null;
      if (parsed.amount === 900) plan = "basic";
      else if (parsed.amount === 2400) plan = "premium";
      else {
        console.warn("Unknown amount:", parsed.amount);
        return res.status(200).json({
          warning: "Amount doesn't match any plan",
          parsed,
        });
      }

      // Store transaction
      transactionStore.set(parsed.txId, {
        ...parsed,
        plan,
        receivedAt: Date.now(),
        used: false,
      });

      console.log("Transaction stored:", parsed.txId, plan);
      return res.status(200).json({
        success: true,
        txId: parsed.txId,
        plan,
      });
    } catch (err) {
      console.error("/api/payment-webhook error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

function parseSmsTransaction(smsBody, sender) {
  // Try multiple MonCash/NatCash formats
  const text = smsBody.replace(/\s+/g, " ").trim();

  // Find amount (handles "900.00 HTG", "900 HTG", "HTG 900")
  const amountMatch =
    text.match(/(\d+(?:[.,]\d+)?)\s*HTG/i) ||
    text.match(/HTG\s*(\d+(?:[.,]\d+)?)/i) ||
    text.match(/(\d+(?:[.,]\d+)?)\s*gd/i);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(",", "."));

  // Find transaction ID (various formats)
  const txIdMatch =
    text.match(/(?:Transaksyon|Transaction|ID|Ref)[:\s#]+([A-Z0-9]{6,})/i) ||
    text.match(/\b([A-Z0-9]{8,})\b/);
  if (!txIdMatch) return null;
  const txId = txIdMatch[1].toUpperCase();

  // Find sender name (optional)
  const senderMatch =
    text.match(/(?:nan men|de la part de|from|de)\s+([A-Z][a-zA-ZÀ-ÿ\s]+?)(?:\.|,|\d|ID|Transaction)/i);
  const senderName = senderMatch ? senderMatch[1].trim() : sender || null;

  return {
    txId,
    amount,
    currency: "HTG",
    sender: senderName,
    rawSms: smsBody,
  };
}
