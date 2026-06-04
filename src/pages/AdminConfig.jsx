// src/pages/AdminConfig.jsx — v24
// Admin-only live config editor: exam dates, prices, feature flags, usage caps.
// Saves to app_config in Supabase; the app reads it via useAppConfig at runtime.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Check, Crown, ToggleLeft, ToggleRight } from "lucide-react";
import { useAdminAccess } from "../hooks/useAdminAccess";
import { useAppConfig } from "../hooks/useAppConfig";

function toLocalInput(d) {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminConfig() {
  const navigate = useNavigate();
  const { isAdmin, loading: accessLoading } = useAdminAccess();
  const { config, loading, save } = useAppConfig();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && config && !form) {
      setForm({
        exam_9af_start: toLocalInput(config.exam_9af_start),
        exam_9af_range: config.exam_9af_range || "",
        exam_ns4_start: toLocalInput(config.exam_ns4_start),
        exam_ns4_range: config.exam_ns4_range || "",
        price_basic: config.price_basic ?? 900,
        price_premium: config.price_premium ?? 2400,
        flags: { ...config.flags },
      });
    }
  }, [loading, config, form]);

  if (accessLoading || loading || !form) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-violet-500" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Crown size={32} className="mx-auto mb-3 text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Accès refusé</h2>
        <button onClick={() => navigate("/")} className="text-violet-600 font-bold">Retour</button>
      </div>
    );
  }

  const setFlag = (k) => setForm((f) => ({ ...f, flags: { ...f.flags, [k]: !f.flags[k] } }));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await save({
      exam_9af_start: form.exam_9af_start ? new Date(form.exam_9af_start).toISOString() : null,
      exam_9af_range: form.exam_9af_range,
      exam_ns4_start: form.exam_ns4_start ? new Date(form.exam_ns4_start).toISOString() : null,
      exam_ns4_range: form.exam_ns4_range,
      price_basic: Number(form.price_basic),
      price_premium: Number(form.price_premium),
      flags: form.flags,
    });
    setSaving(false);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 py-3 flex items-center gap-2">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <ArrowLeft size={18} />
        </button>
        <div className="font-black text-sm text-slate-900 dark:text-white flex-1">Configuration de l'app</div>
        <motion.button whileTap={{ scale: 0.96 }} onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-700 text-white text-xs font-bold disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? "Enregistré" : "Enregistrer"}
        </motion.button>
      </header>

      <main className="p-3 space-y-4 max-w-md mx-auto">
        {/* Prices */}
        <Section title="Prix (HTG / mois)">
          <Row label="Basic"><NumInput value={form.price_basic} onChange={(v) => setForm({ ...form, price_basic: v })} /></Row>
          <Row label="Premium"><NumInput value={form.price_premium} onChange={(v) => setForm({ ...form, price_premium: v })} /></Row>
        </Section>

        {/* Exam dates */}
        <Section title="Dates d'examen">
          <Row label="9AF début"><DateInput value={form.exam_9af_start} onChange={(v) => setForm({ ...form, exam_9af_start: v })} /></Row>
          <Row label="9AF texte"><TextInput value={form.exam_9af_range} onChange={(v) => setForm({ ...form, exam_9af_range: v })} placeholder="29 juin – 2 juillet" /></Row>
          <Row label="NS4 début"><DateInput value={form.exam_ns4_start} onChange={(v) => setForm({ ...form, exam_ns4_start: v })} /></Row>
          <Row label="NS4 texte"><TextInput value={form.exam_ns4_range} onChange={(v) => setForm({ ...form, exam_ns4_range: v })} placeholder="3 – 7 juillet" /></Row>
        </Section>

        {/* Feature flags */}
        <Section title="Fonctionnalités">
          <FlagRow label="Paiements activés" on={form.flags.payments_on} onToggle={() => setFlag("payments_on")} />
          <FlagRow label="Appels prof IA activés" on={form.flags.calls_on} onToggle={() => setFlag("calls_on")} />
          <FlagRow label="Nouvelles inscriptions" on={form.flags.new_signups} onToggle={() => setFlag("new_signups")} />
        </Section>

        <p className="text-[11px] text-slate-400 text-center px-4">
          Les changements s'appliquent à toute l'app. Les utilisateurs verront les nouveaux prix et dates au prochain chargement.
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
      <h3 className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-3">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
function NumInput({ value, onChange }) {
  return <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
    className="w-28 text-right text-sm px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />;
}
function TextInput({ value, onChange, placeholder }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className="w-44 text-sm px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />;
}
function DateInput({ value, onChange }) {
  return <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)}
    className="w-48 text-xs px-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />;
}
function FlagRow({ label, on, onToggle }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      {on ? <ToggleRight size={30} className="text-emerald-500" /> : <ToggleLeft size={30} className="text-slate-400" />}
    </button>
  );
}
