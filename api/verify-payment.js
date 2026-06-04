// api/verify-payment.js — verifies a user's payment proof and upgrades their plan.
//
// POST body:
//   {
//     accessToken,            // the user's Supabase access token (to identify them securely)
//     planTier,               // "basic" | "premium"
//     method,                 // "moncash" | "natcash"
//     amount,                 // expected amount (HTG) for that plan
//     proofType,              // "id" | "screenshot"
//     transactionId,          // when proofType="id"
//     screenshotData,         // when proofType="screenshot": data:image/...;base64,...
//     customerName, customerWhatsapp
//   }
//
// Flow: if screenshot, OCR the transaction id with the cheapest vision model.
// Then find an UNCONSUMED payment_sms row matching {method, transaction_id} with a
// correct amount. If found: mark it consumed, insert a verified transactions row,
// upgrade profiles.plan_tier. Each SMS id can be consumed only once.
//
// Env: OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { getSupabaseAdmin } from "./_supabaseAdmin";

const CHEAP_OCR_MODEL = "google/gemini-3.5-flash-lite";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = getSupabaseAdmin();
  if (!admin) return res.status(500).json({ error: "server not configured" });

  try {
    const {
      accessToken, planTier, method, amount, proofType,
      transactionId, screenshotData, customerName, customerWhatsapp,
    } = req.body || {};

    if (!accessToken) return res.status(401).json({ error: "not signed in" });
    if (!planTier || !method || !proofType) return res.status(400).json({ error: "missing fields" });

    // Identify the user securely from their token.
    const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
    if (userErr || !userData?.user) return res.status(401).json({ error: "invalid session" });
    const user = userData.user;

    // Resolve the transaction id (typed or OCR'd from the screenshot).
    let txId = (transactionId || "").trim();
    if (proofType === "screenshot") {
      if (!screenshotData) return res.status(400).json({ error: "no screenshot" });
      txId = await extractIdFromImage(screenshotData);
      if (!txId) {
        return res.status(422).json({
          error: "ocr_failed",
          message: "Nou pa rive li ID a sou imaj la. Tape l alamen silvouplè.",
        });
      }
    }
    if (!txId) return res.status(400).json({ error: "no transaction id" });

    // Look up an unconsumed matching SMS.
    const { data: rows } = await admin
      .from("payment_sms")
      .select("*")
      .eq("method", method)
      .eq("transaction_id", txId)
      .limit(1);

    const sms = rows?.[0];

    // Always record the attempt.
    const baseTx = {
      user_id: user.id,
      plan_tier: planTier,
      method,
      amount: amount ?? sms?.amount ?? null,
      submitted_transaction_id: txId,
      proof_type: proofType,
      customer_name: customerName || null,
      customer_whatsapp: customerWhatsapp || null,
    };

    if (!sms) {
      await admin.from("transactions").insert({ ...baseTx, status: "pending", note: "no matching SMS yet" });
      return res.status(200).json({
        data: { status: "pending", message: "Nou poko jwenn peman an. Tann kèk minit epi eseye ankò." },
      });
    }

    if (sms.consumed) {
      await admin.from("transactions").insert({ ...baseTx, status: "duplicate", matched_sms_id: sms.id, note: "id already used" });
      return res.status(200).json({
        data: { status: "duplicate", message: "Sa ID transaksyon sa a deja itilize. Chak peman sèvi yon sèl fwa." },
      });
    }

    // Amount check (allow exact match; if SMS amount is null, skip strict check).
    if (amount != null && sms.amount != null && Number(sms.amount) < Number(amount)) {
      await admin.from("transactions").insert({ ...baseTx, status: "rejected", matched_sms_id: sms.id, note: `amount ${sms.amount} < ${amount}` });
      return res.status(200).json({
        data: { status: "rejected", message: `Montan an pa kòrèk. Nou resevwa ${sms.amount} HTG.` },
      });
    }

    // MATCH — consume the SMS atomically (only if still unconsumed), then upgrade.
    const { data: consumed } = await admin
      .from("payment_sms")
      .update({ consumed: true, consumed_by: user.id })
      .eq("id", sms.id)
      .eq("consumed", false)         // guard against a race: only first wins
      .select()
      .single();

    if (!consumed) {
      await admin.from("transactions").insert({ ...baseTx, status: "duplicate", matched_sms_id: sms.id, note: "race: consumed" });
      return res.status(200).json({ data: { status: "duplicate", message: "Sa ID transaksyon sa a deja itilize." } });
    }

    await admin.from("transactions").insert({ ...baseTx, status: "verified", matched_sms_id: sms.id });

    const months = 1;
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);
    await admin.from("profiles").update({
      plan_tier: planTier,
      plan_started_at: new Date().toISOString(),
      plan_expires_at: expires.toISOString(),
    }).eq("id", user.id);

    return res.status(200).json({
      data: { status: "verified", planTier, message: "Peman konfime! Ou gen aksè Premium kounye a. 🎉" },
    });
  } catch (err) {
    console.error("verify-payment error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

async function extractIdFromImage(imageData) {
  const KEY = process.env.OPENROUTER_API_KEY;
  if (!KEY) return null;
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: CHEAP_OCR_MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Sou kaptiran ekran resi MonCash/NatCash sa a, jwenn SÈLMAN nimewo ID/transaction/reference la. Reponn JSON: {\"id\":\"...\"}. Si ou pa wè l, {\"id\":null}." },
            { type: "image_url", image_url: { url: imageData } },
          ],
        }],
        response_format: { type: "json_object" },
        max_tokens: 100,
        temperature: 0,
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw.replace(/```json\s*|\s*```/g, "").trim());
    return parsed?.id ? String(parsed.id).trim() : null;
  } catch {
    return null;
  }
}
