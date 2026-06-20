// src/pages/AdminExams.jsx — v24
// Admin-only: upload past-exam PDFs to the private 'exams' Supabase Storage
// bucket + an 'exams' metadata row. Lists uploaded exams and allows delete.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Loader2, Trash2, FileText, Crown } from "lucide-react";
import { useAdminAccess } from "../hooks/useAdminAccess";
import { useExams } from "../hooks/useExams";
import { supabase } from "../lib/supabase";

const TRACKS = ["9AF", "NS4"];
const SUBJECTS = ["mathematiques", "physique", "chimie", "biologie", "francais", "sciences_sociales", "philosophie", "creole"];

export default function AdminExams() {
  const navigate = useNavigate();
  const { isAdmin, loading: accessLoading } = useAdminAccess();
  const { exams, loading, reload } = useExams();

  const [year, setYear] = useState(new Date().getFullYear());
  const [track, setTrack] = useState("NS4");
  const [subject, setSubject] = useState("");
  const [premium, setPremium] = useState(true);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (accessLoading) {
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

  const upload = async () => {
    setMsg(null);
    if (!file) { setMsg({ t: "err", m: "Choisis un fichier PDF." }); return; }
    if (file.type !== "application/pdf") { setMsg({ t: "err", m: "Le fichier doit être un PDF." }); return; }
    if (!supabase) { setMsg({ t: "err", m: "Supabase non configuré." }); return; }
    setBusy(true);
    try {
      const safeSubject = subject || "complet";
      const path = `${track}/${year}/${safeSubject}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from("exams").upload(path, file, {
        contentType: "application/pdf", upsert: false,
      });
      if (upErr) throw upErr;

      const title = `${subject ? subject.charAt(0).toUpperCase() + subject.slice(1) + " " : ""}${track} ${year}`;
      const { error: insErr } = await supabase.from("exams").insert({
        year: Number(year), track, subject: subject || null, title, pdf_path: path, premium,
      });
      if (insErr) throw insErr;

      setMsg({ t: "ok", m: "Examen téléversé ✓" });
      setFile(null);
      reload();
    } catch (err) {
      const detail = [err?.message, err?.details, err?.hint, err?.code]
        .filter(Boolean).join(" · ");
      setMsg({ t: "err", m: detail || "Échec du téléversement." });
      console.error("Exam upload failed:", err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (exam) => {
    if (!supabase) return;
    try {
      await supabase.storage.from("exams").remove([exam.pdf_path]);
      await supabase.from("exams").delete().eq("id", exam.id);
      reload();
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 py-3 flex items-center gap-2">
        <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <ArrowLeft size={18} />
        </button>
        <div className="font-black text-sm text-slate-900 dark:text-white">Examens (PDF)</div>
      </header>

      <main className="p-3 space-y-4 max-w-md mx-auto">
        <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 space-y-3">
          <h3 className="text-[10px] uppercase tracking-widest font-black text-slate-500">Nouvel examen</h3>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-[11px] text-slate-500 block mb-1">Année</span>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </label>
            <label className="text-sm">
              <span className="text-[11px] text-slate-500 block mb-1">Niveau</span>
              <select value={track} onChange={(e) => setTrack(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>

          <label className="text-sm block">
            <span className="text-[11px] text-slate-500 block mb-1">Matière (optionnel — vide = examen complet)</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Examen complet</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} />
            Premium (payant)
          </label>

          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Fichier PDF</span>
            <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-violet-500 file:text-white file:font-bold" />
          </label>

          {msg && <p className={`text-xs ${msg.t === "ok" ? "text-emerald-500" : "text-red-500"}`}>{msg.m}</p>}

          <motion.button whileTap={{ scale: 0.97 }} onClick={upload} disabled={busy}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Téléverser
          </motion.button>
        </section>

        <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
          <h3 className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-3">
            Examens téléversés ({exams.length})
          </h3>
          {loading ? (
            <Loader2 className="animate-spin mx-auto text-slate-400" />
          ) : exams.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Aucun examen pour l'instant.</p>
          ) : (
            <div className="space-y-2">
              {exams.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <FileText size={16} className="text-violet-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{e.title || `${e.track} ${e.year}`}</div>
                    <div className="text-[10px] text-slate-500">{e.track} · {e.year}{e.premium ? " · Premium" : " · Gratuit"}</div>
                  </div>
                  <button onClick={() => remove(e)} className="p-1.5 text-red-500"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
