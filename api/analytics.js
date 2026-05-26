// api/analytics.js
// Admin-only. Returns dashboard metrics from Vercel KV.

import { kv } from "@vercel/kv";

const hasKV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const adminToken = req.headers["x-admin-token"];
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET || adminToken !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!hasKV) {
    return res.status(200).json({
      data: {
        warning: "Vercel KV not configured. Add KV_REST_API_URL and KV_REST_API_TOKEN to enable analytics.",
        totalPaidSignups: 0,
        basicCount: 0,
        premiumCount: 0,
        totalRevenueHTG: 0,
        recentTransactions: [],
      },
    });
  }

  try {
    const [
      totalPaidSignups,
      basicCount,
      premiumCount,
      totalRevenueHTG,
      recentTxRaw,
      totalUsers,
      activeToday,
      activeThisWeek,
      scanCount,
      chatCount,
    ] = await Promise.all([
      kv.get("metrics:total_paid_signups").then((v) => Number(v || 0)),
      kv.get("metrics:plan_basic_count").then((v) => Number(v || 0)),
      kv.get("metrics:plan_premium_count").then((v) => Number(v || 0)),
      kv.get("metrics:total_revenue_htg").then((v) => Number(v || 0)),
      kv.lrange("tx:recent", 0, 49),
      kv.get("metrics:total_users").then((v) => Number(v || 0)),
      kv.scard("users:active_today").catch(() => 0),
      kv.scard("users:active_week").catch(() => 0),
      kv.get("metrics:scan_count").then((v) => Number(v || 0)),
      kv.get("metrics:chat_count").then((v) => Number(v || 0)),
    ]);

    const recentTransactions = (recentTxRaw || []).map((s) => {
      try { return typeof s === "string" ? JSON.parse(s) : s; }
      catch { return null; }
    }).filter(Boolean);

    // MRR estimate: count of active subscribers × plan price
    const basicMRR = basicCount * 900;
    const premiumMRR = premiumCount * 2400;
    const totalMRR = basicMRR + premiumMRR;
    const ARR = totalMRR * 12;

    // ARPU
    const totalPayingUsers = basicCount + premiumCount;
    const ARPU = totalPayingUsers > 0 ? Math.round(totalRevenueHTG / totalPayingUsers) : 0;

    // Conversion rate (paid / total users)
    const conversionRate = totalUsers > 0 ? ((totalPayingUsers / totalUsers) * 100).toFixed(2) : "0.00";

    return res.status(200).json({
      data: {
        revenue: {
          totalHTG: totalRevenueHTG,
          totalUSD: Math.round(totalRevenueHTG / 131 * 100) / 100,
          MRR: totalMRR,
          ARR,
          ARPU,
        },
        users: {
          total: totalUsers,
          activeToday,
          activeThisWeek,
          paidTotal: totalPayingUsers,
          basicUsers: basicCount,
          premiumUsers: premiumCount,
          freeUsers: totalUsers - totalPayingUsers,
          conversionRate: parseFloat(conversionRate),
        },
        usage: {
          totalScans: scanCount,
          totalChats: chatCount,
        },
        recentTransactions,
        generatedAt: Date.now(),
      },
    });
  } catch (err) {
    console.error("/api/analytics error:", err);
    return res.status(500).json({ error: "Failed to load analytics", message: err.message });
  }
}
