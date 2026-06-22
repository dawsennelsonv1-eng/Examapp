// src/pages/AdminDashboard.jsx v22
// In-app admin dashboard. Tabs: Aperçu (overview), Financier, Acquisition,
// Engagement, Ingénierie, Bonus (10 extra metrics).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, RefreshCw, Loader2, Crown, Users, Zap, AlertCircle,
  DollarSign, Activity, Wrench, Sparkles, TrendingUp, Calendar,
  Wallet, Target, Globe, BarChart3,
} from "lucide-react";
import { useAdminAccess } from "../hooks/useAdminAccess";
import { MetricCard, BarChart, Donut } from "../components/admin/MetricBlocks";

const TABS = [
  { id: "overview",   label: "Aperçu",       icon: BarChart3 },
  { id: "financial",  label: "Financier",    icon: DollarSign },
  { id: "acquisition",label: "Acquisition",  icon: Target },
  { id: "engagement", label: "Engagement",   icon: Activity },
  { id: "engineering",label: "Ingénierie",   icon: Wrench },
  { id: "bonus",      label: "Bonus",        icon: Sparkles },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, loading: accessLoading } = useAdminAccess();

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState("30d");

  useEffect(() => {
    if (accessLoading) return;
    if (!isAdmin) return;
    fetchMetrics();
    // eslint-disable-next-line
  }, [accessLoading, isAdmin, range]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const secret = (typeof localStorage !== "undefined" && localStorage.getItem("laureat.adminSecret")) || "";
      const response = await fetch(`/api/metrics?range=${range}`, {
        headers: { "X-Admin-Secret": secret },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      const { data } = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  // ====== ACCESS GUARD ======
  if (accessLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 size={28} className="animate-spin mx-auto text-violet-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Crown size={32} className="mx-auto mb-3 text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Accès refusé</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Cette page est réservée aux administrateurs.
        </p>
        <button onClick={() => navigate("/")} className="text-violet-600 font-bold">Retour à l'accueil</button>
      </div>
    );
  }

  // ====== DASHBOARD ======
  return (
    <div className="pb-28 min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 py-3 flex items-center gap-2">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <span>Dashboard Admin</span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
              Laureat AI
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {metrics?.generatedAt && new Date(metrics.generatedAt).toLocaleTimeString("fr-FR")}
          </div>
        </div>

        {/* Range selector */}
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1.5 rounded-lg focus:outline-none"
        >
          <option value="7d">7 jours</option>
          <option value="30d">30 jours</option>
          <option value="90d">90 jours</option>
        </select>

        <button onClick={fetchMetrics} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </header>

      {/* Tab bar */}
      <div className="px-2 py-2 overflow-x-auto scrollbar-hide border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? "bg-gradient-to-r from-violet-500 to-indigo-700 text-white shadow-md"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="p-3 space-y-4">
        {error && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 ring-1 ring-red-200 dark:ring-red-700/40 flex gap-3">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-sm text-red-900 dark:text-red-200">Erreur</div>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {metrics?._meta?.source === "mock" && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 ring-1 ring-amber-300 dark:ring-amber-700/40 flex gap-3">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-amber-900 dark:text-amber-200">Données réelles indisponibles</div>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">{diagnoseReason(metrics._meta.reason)}</p>
              <p className="text-[10px] text-amber-700/70 dark:text-amber-400/60 mt-1.5 font-mono break-all">code: {metrics._meta.reason}</p>
            </div>
          </div>
        )}

        {loading && !metrics && (
          <div className="text-center py-12">
            <Loader2 size={32} className="animate-spin mx-auto text-violet-500" />
          </div>
        )}

        {metrics && tab === "overview" && <Overview metrics={metrics} />}
        {metrics && tab === "financial" && <Financial metrics={metrics} />}
        {metrics && tab === "acquisition" && <Acquisition metrics={metrics} />}
        {metrics && tab === "engagement" && <Engagement metrics={metrics} />}
        {metrics && tab === "engineering" && <Engineering metrics={metrics} />}
        {metrics && tab === "bonus" && <Bonus metrics={metrics} />}
      </main>
    </div>
  );
}

// ======================== TABS ========================

function diagnoseReason(reason) {
  if (reason === "no_service_role_key")
    return "Le serveur ne trouve pas la clé SUPABASE_SERVICE_ROLE_KEY. Ajoute-la dans Vercel → Settings → Environment Variables (sa valeur est dans Supabase → Settings → API → service_role), puis redéploie. Sans elle, le dashboard ne peut pas lire la base.";
  if (reason === "profiles_query_failed")
    return "La clé existe mais la lecture de la table « profiles » a échoué (table manquante ou RLS). Vérifie que la table profiles existe et lance FIX.sql.";
  if (typeof reason === "string" && reason.startsWith("exception:"))
    return "Erreur serveur en lisant la base : " + reason.slice("exception:".length);
  return "Impossible de lire la base de données pour le moment.";
}

function Overview({ metrics }) {
  const { financial, engagement, engineering, series } = metrics;
  return (
    <>
      {/* Top KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="MRR"
          value={`${financial.mrr_htg.toLocaleString("fr-FR")} HTG`}
          sublabel={`${(financial.basic_subscribers + financial.premium_subscribers)} abonnés`}
          icon={DollarSign}
          color="emerald"
          trend="up"
          series={series.mrr}
        />
        <MetricCard
          label="DAU"
          value={engagement.dau.toLocaleString("fr-FR")}
          sublabel={`MAU: ${engagement.mau.toLocaleString("fr-FR")}`}
          icon={Users}
          color="violet"
          trend="up"
          series={series.dau}
        />
        <MetricCard
          label="ARR"
          value={`${(financial.arr_htg / 1000).toFixed(0)}k HTG`}
          sublabel={`Valuation potentielle`}
          icon={TrendingUp}
          color="amber"
        />
        <MetricCard
          label="LTV:CAC"
          value={financial.ltv_cac_ratio}
          sublabel={Number(financial.ltv_cac_ratio) >= 3 ? "Machine à imprimer 🚀" : "Non mesuré"}
          icon={Target}
          color={Number(financial.ltv_cac_ratio) >= 3 ? "emerald" : "slate"}
        />
      </div>

      {/* Subscriber split donut */}
      <section className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm">
        <h3 className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-3">Répartition des abonnés</h3>
        <div className="flex items-center gap-4">
          <Donut
            segments={[
              { value: financial.basic_subscribers, color: "#3b82f6" },
              { value: financial.premium_subscribers, color: "#f59e0b" },
            ]}
            centerValue={financial.basic_subscribers + financial.premium_subscribers}
            centerLabel="payants"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Basic (750)</span>
              <span className="ml-auto font-black text-sm text-slate-900 dark:text-white">{financial.basic_subscribers}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Premium (1200)</span>
              <span className="ml-auto font-black text-sm text-slate-900 dark:text-white">{financial.premium_subscribers}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Engagement health */}
      <section className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm">
        <h3 className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-3">Santé de l'engagement</h3>
        <BarChart
          data={[
            { label: "Rétention J1", value: engagement.day1_retention_pct, displayValue: `${engagement.day1_retention_pct}%`, color: "from-emerald-500 to-teal-600" },
            { label: "Rétention J7", value: engagement.day7_retention_pct, displayValue: `${engagement.day7_retention_pct}%`, color: "from-violet-500 to-indigo-600" },
            { label: "Rétention J30", value: engagement.day30_retention_pct, displayValue: `${engagement.day30_retention_pct}%`, color: "from-amber-500 to-orange-600" },
            { label: "DAU/MAU stickiness", value: parseFloat(engagement.dau_mau_pct), displayValue: `${engagement.dau_mau_pct}%`, color: "from-rose-500 to-pink-600" },
          ]}
          maxValue={100}
        />
      </section>

      {/* Engineering pulse */}
      <section className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm">
        <h3 className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-3">Système</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{engineering.uptime_pct}%</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">Uptime</div>
          </div>
          <div>
            <div className="text-2xl font-black text-violet-600 dark:text-violet-400">{engineering.ttft_ms}ms</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">TTFT</div>
          </div>
          <div>
            <div className={`text-2xl font-black ${engineering.api_error_pct < 2 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {engineering.api_error_pct}%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">Erreurs</div>
          </div>
        </div>
      </section>
    </>
  );
}

function Financial({ metrics }) {
  const f = metrics.financial;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="MRR" value={`${f.mrr_htg.toLocaleString("fr-FR")} HTG`} hint="Revenu mensuel récurrent" icon={DollarSign} color="emerald" trend="up" series={metrics.series.mrr} />
        <MetricCard label="ARR" value={`${(f.arr_htg / 1000).toFixed(0)}k HTG`} hint="Annual recurring revenue. La valeur que les acheteurs regardent." icon={TrendingUp} color="amber" />
        <MetricCard label="ARPU" value={`${f.arpu_htg.toLocaleString("fr-FR")} HTG`} hint="Revenu moyen par utilisateur payant" icon={Wallet} color="violet" />
        <MetricCard label="CAC" value={f.cac_htg != null ? `${f.cac_htg.toLocaleString("fr-FR")} HTG` : "Non mesuré"} hint="Coût d'acquisition — non mesuré (marketing organique)." icon={Target} color="blue" />
        <MetricCard label="LTV" value={f.ltv_htg != null ? `${f.ltv_htg.toLocaleString("fr-FR")} HTG` : "Non mesuré"} hint="Valeur d'un client (achat unique jusqu'aux examens)." icon={Users} color="emerald" />
        <MetricCard label="LTV:CAC" value={f.ltv_cac_ratio} hint="Non mesuré tant que le CAC n'est pas suivi." icon={Activity} color={Number(f.ltv_cac_ratio) >= 3 ? "emerald" : "slate"} />
        <MetricCard label="Gross Margin" value={f.gross_margin_pct != null ? `${f.gross_margin_pct}%` : "Non mesuré"} hint="Marge brute — nécessite le suivi des coûts API." icon={Zap} color="emerald" />
        <MetricCard label="Payment success" value={`${f.payment_success_pct}%`} hint="% MonCash/NatCash qui aboutissent" icon={DollarSign} color={f.payment_success_pct > 85 ? "emerald" : "amber"} />
        <MetricCard label="Checkout abandon" value={`${f.checkout_abandonment_pct}%`} hint="% qui tap Upgrade mais ne complètent pas le PIN USSD" icon={AlertCircle} color="rose" />
      </div>
    </>
  );
}

function Acquisition({ metrics }) {
  const a = metrics.acquisition;
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard label="K-Factor viral" value={a.viral_k_factor} hint="Nouveaux users qu'un user existant amène. ≥1 = croissance organique." icon={Sparkles} color="violet" />
      <MetricCard label="Free → Paid" value={`${a.free_to_paid_pct}%`} hint="% de free users qui passent à payant" icon={TrendingUp} color="emerald" />
      <MetricCard label="CPI" value={`${a.cpi_htg} HTG`} hint="Coût par installation" icon={Target} color="amber" />
      <MetricCard label="Organique / Payant" value={a.organic_paid_ratio} hint="Balance acquisition" icon={Globe} color="blue" />
      <MetricCard label="Time to Conversion" value={`${a.time_to_conversion_days}j`} hint="Jours moyens avant upgrade" icon={Calendar} color="rose" />
    </div>
  );
}

function Engagement({ metrics }) {
  const e = metrics.engagement;
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard label="DAU" value={e.dau.toLocaleString("fr-FR")} icon={Users} color="violet" series={metrics.series.dau} />
      <MetricCard label="MAU" value={e.mau.toLocaleString("fr-FR")} icon={Users} color="blue" />
      <MetricCard label="DAU/MAU" value={`${e.dau_mau_pct}%`} hint="≥20% = produit qui crée une habitude quotidienne" icon={Activity} color={parseFloat(e.dau_mau_pct) > 20 ? "emerald" : "amber"} />
      <MetricCard label="Churn mensuel" value={`${e.churn_monthly_pct}%`} hint="% d'abonnés qui partent par mois" icon={AlertCircle} color={e.churn_monthly_pct < 10 ? "emerald" : "rose"} />
      <MetricCard label="Rétention J1" value={`${e.day1_retention_pct}%`} icon={Calendar} color="emerald" />
      <MetricCard label="Rétention J7" value={`${e.day7_retention_pct}%`} icon={Calendar} color="violet" />
      <MetricCard label="Rétention J30" value={`${e.day30_retention_pct}%`} icon={Calendar} color="amber" />
      <MetricCard label="Session moyenne" value={`${e.avg_session_minutes} min`} icon={Activity} color="blue" />
      <MetricCard label="Sessions/jour" value={e.sessions_per_user_day} hint="Combien de fois un user ouvre l'app par jour" icon={Zap} color="emerald" />
    </div>
  );
}

function Engineering({ metrics }) {
  const e = metrics.engineering;
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard label="TTFT" value={`${e.ttft_ms}ms`} hint="Time to first token. Critique pour la perception de rapidité." icon={Zap} color={e.ttft_ms < 1000 ? "emerald" : "amber"} />
      <MetricCard label="Coût/gen" value={`$${e.cost_per_gen_usd}`} hint="Coût LLM par prompt" icon={DollarSign} color="blue" series={metrics.series.errors} />
      <MetricCard label="DB pool" value={`${e.db_pool_pct}%`} hint="Usage connexions Supabase" icon={Activity} color={e.db_pool_pct < 70 ? "emerald" : "amber"} />
      <MetricCard label="Webhooks" value={e.webhook_volume.toLocaleString("fr-FR")} hint="Volume quotidien (n8n/Make)" icon={Wrench} color="violet" />
      <MetricCard label="Erreurs API" value={`${e.api_error_pct}%`} hint="404, 500, timeouts LLM" icon={AlertCircle} color={e.api_error_pct < 2 ? "emerald" : "rose"} />
      <MetricCard label="Crash-free" value={`${e.crash_free_pct}%`} hint="Sessions sans crash" icon={Activity} color="emerald" />
      <MetricCard label="Uptime" value={`${e.uptime_pct}%`} hint="Cible: 99.9%" icon={Globe} color="emerald" />
      <MetricCard label="Cold load" value={`${e.cold_load_ms}ms`} hint="Temps de chargement à froid sur 3G/4G" icon={Zap} color={e.cold_load_ms < 2000 ? "emerald" : "amber"} />
    </div>
  );
}

function Bonus({ metrics }) {
  const groupColors = {
    Financial: "emerald",
    Acquisition: "blue",
    Engagement: "violet",
    Engineering: "amber",
  };
  return (
    <>
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 p-4 text-white mb-2">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} />
          <h3 className="text-xs uppercase tracking-widest font-black">Les 10 métriques bonus</h3>
        </div>
        <p className="text-xs opacity-90">
          Les KPIs spécifiques à Laureat qui font la différence — souvent oubliés des dashboards génériques.
        </p>
      </div>

      <div className="space-y-3">
        {(metrics.extras || []).map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400">
                    {m.group}
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">{m.label}</div>
                <div className="font-black text-xl text-violet-600 dark:text-violet-400">{m.value}</div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{m.hint}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}
