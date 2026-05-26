// src/pages/Admin.jsx
// v8: Full admin dashboard.
// - Analytics (revenue, users, conversion, MRR/ARR)
// - Payment number editor (changes propagate to /paywall)
// - Recent transactions list
// - Quiz generator (kept from v6)
// - Plan override (manually upgrade a user — test or comp)

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Lock, RefreshCw, CheckCircle2, XCircle, Loader2, Database, FileText,
  DollarSign, Users, TrendingUp, Activity, Settings, Save, Edit2,
  CreditCard, BarChart3, Crown, Zap,
} from "lucide-react";
import {
  generateQuizzesForSubject, getAllCachedSubjects,
  clearQuizCache, setAdminToken,
} from "../services/quizService";
import { SUBJECTS_BY_TRACK } from "../utils/constants";
import { useUsage } from "../hooks/useUsage";

const ADMIN_TOKEN_KEY = "laureat.adminToken";

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (stored && stored.length >= 8) {
      setAdminInput(stored);
      // Try to verify by fetching analytics
      fetch("/api/analytics", { headers: { "X-Admin-Token": stored } })
        .then((r) => {
          if (r.ok) setAuthed(true);
        })
        .catch(() => {});
    }
  }, []);

  const handleAuth = async () => {
    if (adminInput.trim().length < 8) {
      setError("Token trop court");
      return;
    }
    setAdminToken(adminInput.trim());
    // Verify
    const r = await fetch("/api/analytics", {
      headers: { "X-Admin-Token": adminInput.trim() },
    });
    if (r.ok) {
      setAuthed(true);
      setError(null);
    } else {
      setError("Token invalide");
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center mb-4">
            <Lock size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Admin Console</h1>
          <p className="text-sm text-slate-500 mb-6">Entre ton token administrateur.</p>
          <input type="password" value={adminInput} onChange={(e) => setAdminInput(e.target.value)}
            placeholder="Admin token"
            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
            onKeyDown={(e) => e.key === "Enter" && handleAuth()} />
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <button onClick={handleAuth} className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold">
            Continuer
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 sticky top-0 z-10">
        <h1 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Database size={20} className="text-violet-600" /> Admin Console
        </h1>
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
          <TabBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={BarChart3}>Dashboard</TabBtn>
          <TabBtn active={tab === "transactions"} onClick={() => setTab("transactions")} icon={DollarSign}>Transactions</TabBtn>
          <TabBtn active={tab === "config"} onClick={() => setTab("config")} icon={Settings}>Configuration</TabBtn>
          <TabBtn active={tab === "quiz"} onClick={() => setTab("quiz")} icon={FileText}>Quiz</TabBtn>
          <TabBtn active={tab === "dev"} onClick={() => setTab("dev")} icon={Activity}>Dev</TabBtn>
        </div>
      </header>

      <main className="px-4 py-6">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "transactions" && <TransactionsTab />}
        {tab === "config" && <ConfigTab />}
        {tab === "quiz" && <QuizTab />}
        {tab === "dev" && <DevTab />}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
        active ? "bg-violet-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
      }`}>
      <Icon size={14} />{children}
    </button>
  );
}

function DashboardTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    try {
      const r = await fetch("/api/analytics", { headers: { "X-Admin-Token": token } });
      const result = await r.json();
      setData(result.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-12 text-slate-500"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!data) return <div className="text-center py-12 text-slate-500">Pas de données</div>;

  if (data.warning) {
    return (
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 p-4">
        <p className="text-sm text-amber-800 dark:text-amber-300">{data.warning}</p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
          Pour activer: Vercel → Storage → Create KV Database → Connect to project.
          Les variables d'env KV_REST_API_URL et KV_REST_API_TOKEN seront ajoutées automatiquement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Métriques clés</h2>
        <button onClick={load} className="text-xs text-violet-600 flex items-center gap-1">
          <RefreshCw size={12} /> Rafraîchir
        </button>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="MRR" value={`${data.revenue?.MRR || 0}`} unit="HTG" sub={`$${Math.round((data.revenue?.MRR || 0) / 131)}`} color="from-emerald-500 to-teal-600" icon={DollarSign} />
        <MetricCard label="ARR" value={`${data.revenue?.ARR || 0}`} unit="HTG" sub={`$${Math.round((data.revenue?.ARR || 0) / 131)}`} color="from-violet-500 to-indigo-600" icon={TrendingUp} />
        <MetricCard label="Revenu total" value={`${data.revenue?.totalHTG || 0}`} unit="HTG" sub={`$${data.revenue?.totalUSD || 0}`} color="from-amber-500 to-orange-600" icon={DollarSign} />
        <MetricCard label="ARPU" value={`${data.revenue?.ARPU || 0}`} unit="HTG" color="from-pink-500 to-rose-600" icon={Users} />
      </div>

      {/* Users */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-6">Utilisateurs</h2>
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <UserStat label="Total" value={data.users?.total || 0} />
          <UserStat label="Actifs aujourd'hui" value={data.users?.activeToday || 0} />
          <UserStat label="Actifs 7j" value={data.users?.activeThisWeek || 0} />
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mb-3">
          <div className="text-[11px] font-semibold text-slate-500 mb-2">Par plan</div>
          <PlanRow icon="🆓" label="Gratuit" count={data.users?.freeUsers || 0} total={data.users?.total || 1} color="bg-slate-400" />
          <PlanRow icon="⚡" label="Basic" count={data.users?.basicUsers || 0} total={data.users?.total || 1} color="bg-blue-500" />
          <PlanRow icon="👑" label="Premium" count={data.users?.premiumUsers || 0} total={data.users?.total || 1} color="bg-amber-500" />
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Conversion (free → paid)</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{data.users?.conversionRate || 0}%</div>
        </div>
      </div>

      {/* Usage */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-6">Usage</h2>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Scans" value={data.usage?.totalScans || 0} color="from-cyan-500 to-blue-600" icon={Activity} />
        <MetricCard label="Chats" value={data.usage?.totalChats || 0} color="from-purple-500 to-pink-600" icon={Activity} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, sub, color, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</span>
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon size={14} className="text-white" />
        </div>
      </div>
      <div className="text-xl font-bold text-slate-900 dark:text-white">
        {value} {unit && <span className="text-xs font-normal text-slate-500">{unit}</span>}
      </div>
      {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function UserStat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function PlanRow({ icon, label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-sm">{icon}</span>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-16">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-900 dark:text-white w-10 text-right">{count}</span>
    </div>
  );
}

function TransactionsTab() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    try {
      const r = await fetch("/api/analytics", { headers: { "X-Admin-Token": token } });
      const result = await r.json();
      setTxs(result.data?.recentTransactions || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-slate-500" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Transactions récentes</h2>
        <button onClick={load} className="text-xs text-violet-600 flex items-center gap-1">
          <RefreshCw size={12} /> Rafraîchir
        </button>
      </div>

      {txs.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-500">Pas encore de transactions</div>
      ) : (
        <div className="space-y-2">
          {txs.map((tx, i) => (
            <div key={i} className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                tx.plan === "premium" ? "bg-gradient-to-br from-amber-400 to-orange-600" :
                tx.plan === "basic" ? "bg-gradient-to-br from-blue-400 to-cyan-600" :
                "bg-slate-300 dark:bg-slate-700"
              }`}>
                {tx.plan === "premium" ? <Crown size={18} className="text-white" /> :
                 tx.plan === "basic" ? <Zap size={18} className="text-white" /> :
                 <DollarSign size={18} className="text-slate-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {tx.sender || "Anonyme"} · {tx.amount} HTG
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {tx.txId} · {tx.plan || "non identifié"} · {tx.used ? "utilisé" : "en attente"}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex-shrink-0">
                {new Date(tx.receivedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigTab() {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then((d) => setConfig(d.data));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!config) return <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-slate-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Numéros de paiement</h2>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">MonCash numéro</label>
            <input type="text" value={config.paymentConfig?.moncash?.number || ""}
              onChange={(e) => setConfig({...config, paymentConfig: {...config.paymentConfig, moncash: {...config.paymentConfig.moncash, number: e.target.value}}})}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">MonCash nom</label>
            <input type="text" value={config.paymentConfig?.moncash?.name || ""}
              onChange={(e) => setConfig({...config, paymentConfig: {...config.paymentConfig, moncash: {...config.paymentConfig.moncash, name: e.target.value}}})}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">NatCash numéro</label>
            <input type="text" value={config.paymentConfig?.natcash?.number || ""}
              onChange={(e) => setConfig({...config, paymentConfig: {...config.paymentConfig, natcash: {...config.paymentConfig.natcash, number: e.target.value}}})}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">NatCash nom</label>
            <input type="text" value={config.paymentConfig?.natcash?.name || ""}
              onChange={(e) => setConfig({...config, paymentConfig: {...config.paymentConfig, natcash: {...config.paymentConfig.natcash, name: e.target.value}}})}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white" />
          </div>

          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={16} /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saving ? "Sauvegarde..." : saved ? "Sauvegardé !" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DevTab() {
  const { upgradePlan } = useUsage();
  const [planOverride, setPlanOverride] = useState("free");

  const applyOverride = () => {
    upgradePlan(planOverride);
    alert(`Plan changé à ${planOverride}`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 p-4">
        <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">🛠️ Outils de test</h3>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Utilisé pour tester rapidement sans payer.
        </p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Forcer un plan</h3>
        <div className="flex gap-2 mb-3">
          {["free", "basic", "premium"].map((p) => (
            <button key={p} onClick={() => setPlanOverride(p)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize ${
                planOverride === p ? "bg-violet-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}>
              {p}
            </button>
          ))}
        </div>
        <button onClick={applyOverride} className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold">
          Appliquer
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Vider le cache local</h3>
        <p className="text-xs text-slate-500 mb-3">Supprime sessions, préférences, onboarding pour repartir de zéro.</p>
        <button onClick={() => {
          if (confirm("Vider TOUT le cache local ?")) {
            localStorage.clear();
            window.location.href = "/";
          }
        }} className="w-full py-3 rounded-xl bg-red-600 text-white font-bold">
          Tout effacer
        </button>
      </div>
    </div>
  );
}

function QuizTab() {
  const [track, setTrack] = useState("NS4");
  const [selectedSubject, setSelectedSubject] = useState("Mathématiques");
  const [pastExamsText, setPastExamsText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cachedSubjects, setCachedSubjects] = useState([]);

  useEffect(() => { setCachedSubjects(getAllCachedSubjects()); }, [result]);

  const handleGenerate = async () => {
    if (!pastExamsText.trim() || pastExamsText.length < 200) {
      setError("Colle au moins 200 caractères d'examens passés");
      return;
    }
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const data = await generateQuizzesForSubject({
        subject: selectedSubject, track, pastExamsText, count: 50, onProgress: setProgress,
      });
      setResult({ subject: selectedSubject, count: data.questions.length, expiresAt: data.expiresAt });
      setPastExamsText("");
    } catch (err) {
      setError(err.message || "Erreur");
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };

  return (
    <div className="space-y-4">
      {cachedSubjects.length > 0 && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Quiz en cache</h2>
          <div className="space-y-2">
            {cachedSubjects.map((s) => (
              <div key={s.subject} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FileText size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">{s.subject}</div>
                  <div className="text-[11px] text-slate-500">{s.count} questions</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { clearQuizCache(); setCachedSubjects([]); }} className="text-xs text-red-500 underline">
            Vider le cache
          </button>
        </>
      )}

      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-6">Générer un quiz</h2>
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Niveau</label>
          <div className="flex gap-2">
            {["9AF", "NS4"].map((tk) => (
              <button key={tk} onClick={() => { setTrack(tk); setSelectedSubject((SUBJECTS_BY_TRACK[tk] || [])[0]); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${track === tk ? "bg-violet-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>
                {tk}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Matière</label>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white">
            {(SUBJECTS_BY_TRACK[track] || []).map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Examens passés</label>
          <textarea value={pastExamsText} onChange={(e) => setPastExamsText(e.target.value)}
            placeholder="Colle le texte des examens MENFP..."
            rows={8}
            className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <div className="text-[10px] text-slate-500 mt-1">{pastExamsText.length} caractères</div>
        </div>
        <button onClick={handleGenerate} disabled={generating || pastExamsText.length < 200}
          className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
          {generating ? (<><Loader2 size={16} className="animate-spin" />{progress || "Génération..."}</>) : (<><RefreshCw size={16} />Générer 50 questions</>)}
        </button>
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300">
            <XCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}
        {result && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
            <span>{result.count} questions générées pour {result.subject}.</span>
          </div>
        )}
      </div>
    </div>
  );
}
