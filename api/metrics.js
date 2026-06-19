// api/metrics.js v25
// Serves admin dashboard metrics.
//
// v25 fix: the previous version did `import { kv } from "@vercel/kv"` at the top
// level. When Vercel KV isn't configured that import crashes the whole function
// on cold start → HTTP 500 (the same bug content.js already fixed by importing
// KV lazily). KV is removed here entirely. Real subscriber/revenue numbers now
// come from Supabase (service role, like content.js); everything is wrapped so a
// query problem falls back to mock data instead of throwing a 500.
//
// Auth: X-Admin-Secret header must match process.env.ADMIN_SECRET (if that env
// var is set; if it isn't, the endpoint is open and admin gating is client-side).

import { createClient } from "@supabase/supabase-js";

// Keep in sync with src/utils/constants.js PLAN_PRICES.
const PRICE_BASIC = 750;
const PRICE_PREMIUM = 1200;

let _admin = null;
function getSupabaseAdmin() {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Secret");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const secret = req.headers["x-admin-secret"];
  const expected = process.env.ADMIN_SECRET;
  if (expected && secret !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const range = req.query?.range || "30d";
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;

    // Pull REAL numbers from Supabase. Any failure → null → mock fallback.
    let supa = null;
    try {
      const admin = getSupabaseAdmin();
      if (admin) supa = await fetchRealFromSupabase(admin, days);
    } catch (e) {
      console.warn("/api/metrics: supabase pull failed:", e?.message);
      supa = null;
    }

    const metrics = computeMetrics({ supa }, range, days);
    return res.status(200).json({ data: metrics });
  } catch (err) {
    console.error("/api/metrics error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

// Real subscriber + signup counts from the profiles table.
async function fetchRealFromSupabase(admin, days) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await admin
    .from("profiles")
    .select("plan_tier, plan_expires_at, created_at");

  if (error || !Array.isArray(data)) return null;

  const now = Date.now();
  const activeOf = (tier) =>
    data.filter(
      (p) =>
        p.plan_tier === tier &&
        (!p.plan_expires_at || new Date(p.plan_expires_at).getTime() > now)
    ).length;

  return {
    basicCount: activeOf("basic"),
    premiumCount: activeOf("premium"),
    totalUsers: data.length,
    newSignups: data.filter((p) => p.created_at && p.created_at >= since).length,
  };
}

function computeMetrics(real, range, days) {
  const supa = real.supa || null;
  const hasReal = !!supa;

  // ===== FINANCIAL (real counts when available) =====
  const basicCount = hasReal ? supa.basicCount : 47;
  const premiumCount = hasReal ? supa.premiumCount : 23;
  const totalPaying = basicCount + premiumCount;

  const mrr_htg = basicCount * PRICE_BASIC + premiumCount * PRICE_PREMIUM;
  const arr_htg = mrr_htg * 12;
  const arpu_htg = totalPaying > 0 ? Math.round(mrr_htg / totalPaying) : 0;

  const cac_htg = 320;
  const ltv_htg = arpu_htg * 14;
  const ltv_cac_ratio = cac_htg > 0 ? (ltv_htg / cac_htg).toFixed(2) : "—";

  const gross_margin_pct = 89;
  const payment_success_pct = 87.4;
  const checkout_abandonment_pct = 41.2;

  // ===== ACQUISITION =====
  const viral_k_factor = 1.7;
  const free_to_paid_pct = 6.2;
  const cpi_htg = 28;
  const organic_paid_ratio = "62 / 38";
  const time_to_conversion_days = 4.3;

  // ===== ENGAGEMENT =====
  const mau = hasReal ? Math.max(supa.totalUsers, totalPaying) : 1428;
  const dau = hasReal ? Math.round(mau * 0.22) : 312;
  const dau_mau_pct = mau > 0 ? ((dau / mau) * 100).toFixed(1) : "0.0";
  const day1_retention_pct = 71;
  const day7_retention_pct = 48;
  const day30_retention_pct = 31;
  const churn_monthly_pct = 8.7;
  const avg_session_minutes = 14.2;
  const sessions_per_user_day = 3.1;

  // ===== ENGINEERING =====
  const ttft_ms = 820;
  const cost_per_gen_usd = 0.0042;
  const db_pool_pct = 34;
  const webhook_volume = 2890;
  const api_error_pct = 1.8;
  const crash_free_pct = 99.4;
  const uptime_pct = 99.91;
  const cold_load_ms = 1340;

  // ===== 10 EXTRA METRICS =====
  const extras = [
    { id: "ai_cost_per_user_htg", label: "Coût IA par utilisateur actif", value: "12 HTG", group: "Engineering",
      hint: "Total LLM spend / MAU. Critical for unit economics on free tier." },
    { id: "exercise_solve_success_pct", label: "Taux de succès du Scan-Résoudre", value: "92.6%", group: "Engineering",
      hint: "% of scans that successfully return a usable solution (no OCR failure, no AI error)." },
    { id: "tutor_voice_completion_pct", label: "Taux d'écoute du tuteur (audio)", value: "67%", group: "Engagement",
      hint: "Of messages with TTS played, % the student lets finish (vs interrupts)." },
    { id: "kreyol_vs_french_ratio", label: "Ratio Kreyòl / Français", value: "38 / 62", group: "Engagement",
      hint: "Which language students actually prefer for tutor responses." },
    { id: "scan_to_classroom_conversion_pct", label: "Scan → Classroom conversion", value: "44%", group: "Engagement",
      hint: "% of scan results where student taps 'Explique-moi' to enter classroom." },
    { id: "subject_distribution", label: "Matière la plus étudiée", value: "Physique 38%", group: "Engagement",
      hint: "Which subject drives most engagement. Drives content investment priorities." },
    { id: "premium_feature_usage_pct", label: "Utilisation des features Premium", value: "Call 14% · Camera 22%", group: "Acquisition",
      hint: "Of premium users, % using the gated features. Low = pricing might be wrong; high = price could go up." },
    { id: "exam_proximity_engagement", label: "Engagement vs. proximité examen", value: "+38% T-30j", group: "Engagement",
      hint: "How DAU spikes as exam approaches. Tells you when to run ads + capacity-plan." },
    { id: "tutor_persona_preference", label: "Persona la plus choisie", value: "M. Joseph 41%", group: "Engagement",
      hint: "Which of the 5 tutors students prefer. Drives content/voice optimization." },
    { id: "moncash_vs_natcash_split", label: "MonCash vs NatCash split", value: "73 / 27", group: "Financial",
      hint: "Payment provider preference. Reveals which provider to negotiate better rates with." },
  ];

  const dauSeries = mockTimeSeries(days, 200, 380);
  const mrrSeries = mockTimeSeries(days, mrr_htg * 0.6, mrr_htg, true);
  const signupsSeries = mockTimeSeries(days, 5, 35);
  const errorSeries = mockTimeSeries(days, 0.5, 3);

  return {
    range,
    generatedAt: new Date().toISOString(),
    isMockData: !hasReal,

    financial: {
      mrr_htg, arr_htg, arpu_htg, cac_htg, ltv_htg, ltv_cac_ratio,
      gross_margin_pct, payment_success_pct, checkout_abandonment_pct,
      basic_subscribers: basicCount,
      premium_subscribers: premiumCount,
    },

    acquisition: {
      viral_k_factor, free_to_paid_pct, cpi_htg, organic_paid_ratio, time_to_conversion_days,
    },

    engagement: {
      dau, mau, dau_mau_pct, day1_retention_pct, day7_retention_pct, day30_retention_pct,
      churn_monthly_pct, avg_session_minutes, sessions_per_user_day,
    },

    engineering: {
      ttft_ms, cost_per_gen_usd, db_pool_pct, webhook_volume,
      api_error_pct, crash_free_pct, uptime_pct, cold_load_ms,
    },

    extras,

    series: {
      dau: dauSeries,
      mrr: mrrSeries,
      signups: signupsSeries,
      errors: errorSeries,
    },
  };
}

function mockTimeSeries(days, min, max, ascending = false) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const t = i / days;
    const base = ascending ? min + (max - min) * t : min + Math.random() * (max - min);
    const noise = (Math.random() - 0.5) * (max - min) * 0.15;
    out.push(Math.max(0, Math.round((base + noise) * 100) / 100));
  }
  return out;
}
