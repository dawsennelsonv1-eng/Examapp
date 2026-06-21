// src/pages/AdminExams.jsx — v24
// Admin-only: upload past-exam PDFs to the private 'exams' Supabase Storage
// bucket + an 'exams' metadata row. Lists uploaded exams and allows delete.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Loader2, Trash2, FileText, Crown, Sparkles, GraduationCap, BookOpen, Send } from "lucide-react";
import { useAdminAccess } from "../hooks/useAdminAccess";
import { useExams } from "../hooks/useExams";
import { supabase } from "../lib/supabase";
import { SUBJECTS as COURS_SUBJECTS, CHAPTERS } from "../utils/coursData";

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

  // ----- Quiz generation (curriculum-driven: class → subject → chapter) -----
  const [qTrack, setQTrack] = useState("NS4");
  const [qSubjectId, setQSubjectId] = useState("");
  const [qChapterId, setQChapterId] = useState("");
  const [qCount, setQCount] = useState(30);
  const [qBusy, setQBusy] = useState(false);
  const [qProgress, setQProgress] = useState(0);
  const [qMsg, setQMsg] = useState(null);

  // Subjects available for the chosen class, and chapters for the chosen subject.
  const qSubjects = COURS_SUBJECTS.filter((s) => !s.tracks || s.tracks.includes(qTrack));
  const qChapters = qSubjectId ? (CHAPTERS[qSubjectId] || []) : [];
  const qSubject = COURS_SUBJECTS.find((s) => s.id === qSubjectId) || null;
  const qChapter = qChapters.find((c) => c.id === qChapterId) || null;

  const generateQuizzes = async () => {
    setQMsg(null);
    if (!qSubjectId) { setQMsg({ t: "err", m: "Choisis une matière." }); return; }
    if (!qChapterId) { setQMsg({ t: "err", m: "Choisis un chapitre." }); return; }
    setQBusy(true);
    setQProgress(0);
    const target = Math.max(1, Math.min(Number(qCount) || 30, 200));
    const points = (qChapter?.events || [])
      .filter((e) => e.type !== "quiz")
      .map((e) => `${e.title}${e.summary ? ` — ${e.summary}` : ""}`);
    let done = 0;
    let stored = 0;
    try {
      // Generate in batches of 15 so the serverless function never times out.
      while (done < target) {
        const batchN = Math.min(15, target - done);
        const r = await fetch("/api/content?task=gen_quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            track: qTrack,
            subject: qSubjectId,
            subjectName: qSubject?.name || qSubjectId,
            topic: qChapter?.title || "",
            chapterId: qChapterId,
            points,
            count: batchN,
          }),
        });
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.message || e.error || `HTTP ${r.status}`);
        }
        const { data } = await r.json();
        stored += data?.stored || 0;
        done += data?.generated || batchN;
        setQProgress(Math.min(100, Math.round((done / target) * 100)));
      }
      setQMsg({ t: "ok", m: `${stored} question(s) générée(s) pour « ${qChapter?.title} » ✓` });
    } catch (err) {
      setQMsg({ t: "err", m: err?.message || "Échec de la génération." });
    } finally {
      setQBusy(false);
    }
  };

  // ----- Course tree builder (AI-authored, OCR-grounded) -----
  const [ccTrack, setCcTrack] = useState("NS4");
  const [ccSubjectId, setCcSubjectId] = useState("");
  const [ccBusy, setCcBusy] = useState(false);
  const [ccStage, setCcStage] = useState("");
  const [ccTree, setCcTree] = useState(null);
  const [ccCounts, setCcCounts] = useState(null);
  const [ccMsg, setCcMsg] = useState(null);

  const ccSubjects = COURS_SUBJECTS.filter((s) => !s.tracks || s.tracks.includes(ccTrack));
  const ccSubject = COURS_SUBJECTS.find((s) => s.id === ccSubjectId) || null;

  const buildCourse = async () => {
    setCcMsg(null); setCcTree(null); setCcCounts(null);
    if (!ccSubjectId) { setCcMsg({ t: "err", m: "Choisis une matière." }); return; }
    setCcBusy(true);
    try {
      // 1. Find this subject's uploaded exams (read works via anon client).
      setCcStage("Recherche des examens…");
      let exams = [];
      try {
        const { data } = await supabase
          .from("exams").select("id, pdf_path, subject")
          .eq("track", ccTrack);
        exams = (data || []).filter((e) => !e.subject || e.subject === ccSubjectId).slice(0, 2); // cap OCR cost
      } catch {}

      // 2. OCR each exam (one call each → no timeout).
      let examText = "";
      for (let i = 0; i < exams.length; i++) {
        setCcStage(`Lecture de l'examen ${i + 1}/${exams.length}…`);
        try {
          const r = await fetch("/api/content?task=course_ocr", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examId: exams[i].id }),
          });
          const j = await r.json();
          if (r.ok && j.data?.text) examText += `\n\n--- Examen ${i + 1} ---\n${j.data.text}`;
        } catch {}
      }

      // 3. Build the tree (syllabus + exam text).
      setCcStage(exams.length ? "Construction du cours (examens + programme)…" : "Construction du cours (programme MENFP)…");
      const r = await fetch("/api/content?task=build_course", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: ccTrack, subjectId: ccSubjectId,
          subjectName: ccSubject?.name || ccSubjectId, examText,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
      setCcTree(j.data?.tree || null);
      setCcCounts(j.data?.counts || null);
      setCcMsg({
        t: "ok",
        m: `Brouillon créé : ${j.data?.counts?.chapters || 0} chapitres · ${j.data?.counts?.parts || 0} parties · ${j.data?.counts?.pages || 0} pages${exams.length ? ` (à partir de ${exams.length} examen(s))` : ""}.`,
      });
    } catch (err) {
      setCcMsg({ t: "err", m: err?.message || "Échec de la construction." });
    } finally {
      setCcBusy(false);
      setCcStage("");
    }
  };

  const publishCourse = async () => {
    setCcMsg(null); setCcBusy(true);
    try {
      const r = await fetch("/api/content?task=course_publish", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: ccTrack, subjectId: ccSubjectId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
      setCcMsg({ t: "ok", m: "Cours publié ✓ — visible par les élèves." });
    } catch (err) {
      setCcMsg({ t: "err", m: err?.message || "Échec de la publication." });
    } finally { setCcBusy(false); }
  };

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
    if (!supabase) { setMsg({ t: "err", m: "Supabase non configuré (client manquant)." }); return; }
    setBusy(true);
    let step = "init";
    try {
      // Step 1: ask the server (service-role) for a one-time signed upload URL.
      step = "sign";
      const signResp = await fetch("/api/content?task=exam_sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, year: Number(year), subject: subject || "" }),
      });
      const signJson = await signResp.json();
      if (!signResp.ok) {
        throw new Error(`${signJson.message || signJson.error || "sign error"} ${signJson.raw ? JSON.stringify(signJson.raw) : ""}`);
      }
      const { path, token } = signJson.data || {};
      if (!path || !token) throw new Error("Réponse de signature invalide.");

      // Step 2: upload straight to the signed URL (token-authorized — skips the
      // anon RLS/JWT path that was 503-ing).
      step = "upload";
      const up = await supabase.storage.from("exams").uploadToSignedUrl(path, token, file, {
        contentType: "application/pdf",
      });
      if (up.error) throw up.error;

      // Step 3: record the row.
      step = "auth";
      const { data: { user } } = await supabase.auth.getUser();

      step = "db.insert";
      const title = `${subject ? subject.charAt(0).toUpperCase() + subject.slice(1) + " " : ""}${track} ${year}`;
      const ins = await supabase.from("exams").insert({
        year: Number(year), track, subject: subject || null, title,
        pdf_path: path, premium, uploaded_by: user?.id || null,
      });
      if (ins.error) throw ins.error;

      setMsg({ t: "ok", m: "Examen téléversé ✓" });
      setFile(null);
      reload();
    } catch (err) {
      let full;
      try { full = JSON.stringify(err, Object.getOwnPropertyNames(err || {})); }
      catch { full = String(err); }
      setMsg({ t: "err", m: `[${step}] ${err?.message || "erreur"} — ${full}` });
      console.error("Exam upload failed at step:", step, err);
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

        {/* ===== Generate quiz bank (easy → hard) ===== */}
        <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 space-y-3">
          <h3 className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-1.5">
            <Sparkles size={12} className="text-violet-500" /> Générer des quiz (facile → difficile)
          </h3>

          <label className="text-sm block">
            <span className="text-[11px] text-slate-500 block mb-1">Classe</span>
            <select value={qTrack} onChange={(e) => { setQTrack(e.target.value); setQSubjectId(""); setQChapterId(""); }}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="9AF">9ème AF</option>
              <option value="NS4">NS4</option>
            </select>
          </label>

          <label className="text-sm block">
            <span className="text-[11px] text-slate-500 block mb-1">Matière</span>
            <select value={qSubjectId} onChange={(e) => { setQSubjectId(e.target.value); setQChapterId(""); }}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">— Choisir une matière —</option>
              {qSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <label className="text-sm block">
            <span className="text-[11px] text-slate-500 block mb-1">Chapitre</span>
            <select value={qChapterId} onChange={(e) => setQChapterId(e.target.value)} disabled={!qSubjectId}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50">
              <option value="">{qSubjectId ? "— Choisir un chapitre —" : "Choisis d'abord une matière"}</option>
              {qChapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            {qChapter?.subtitle && <span className="text-[10px] text-slate-400 mt-1 block">{qChapter.subtitle} · {qChapter.events?.filter((e) => e.type !== "quiz").length || 0} points</span>}
          </label>

          <label className="text-sm block">
            <span className="text-[11px] text-slate-500 block mb-1">Nombre de questions (niveau {qTrack})</span>
            <input type="number" min="1" max="200" value={qCount} onChange={(e) => setQCount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </label>

          {qBusy && (
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all" style={{ width: `${qProgress}%` }} />
            </div>
          )}

          {qMsg && <p className={`text-xs ${qMsg.t === "ok" ? "text-emerald-500" : "text-red-500"}`}>{qMsg.m}</p>}

          <motion.button whileTap={{ scale: 0.97 }} onClick={generateQuizzes} disabled={qBusy || !qChapterId}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {qBusy ? <><Loader2 size={16} className="animate-spin" /> Génération... {qProgress}%</> : <><Sparkles size={16} /> Générer le bloc de quiz</>}
          </motion.button>
          <p className="text-[10px] text-slate-400 text-center">L'IA génère pour le chapitre choisi, par lots de 15, et enregistre dans la base.</p>
        </section>

        {/* ===== Cours (IA) — build the curriculum tree from exams + syllabus ===== */}
        <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 space-y-3">
          <h3 className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-1.5">
            <GraduationCap size={12} className="text-violet-500" /> Cours (IA) — construire le programme
          </h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            L'IA lit les examens téléversés de la matière + le programme MENFP, puis bâtit l'arbre Chapitres → Parties → Pages. Tu revois, puis tu publies.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm block">
              <span className="text-[11px] text-slate-500 block mb-1">Classe</span>
              <select value={ccTrack} onChange={(e) => { setCcTrack(e.target.value); setCcSubjectId(""); setCcTree(null); }}
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="9AF">9ème AF</option>
                <option value="NS4">NS4</option>
              </select>
            </label>
            <label className="text-sm block">
              <span className="text-[11px] text-slate-500 block mb-1">Matière</span>
              <select value={ccSubjectId} onChange={(e) => { setCcSubjectId(e.target.value); setCcTree(null); }}
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">— Matière —</option>
                {ccSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>

          {ccBusy && ccStage && (
            <div className="flex items-center gap-2 text-xs text-violet-500">
              <Loader2 size={14} className="animate-spin" /> {ccStage}
            </div>
          )}

          {ccMsg && <p className={`text-xs ${ccMsg.t === "ok" ? "text-emerald-500" : "text-red-500"}`}>{ccMsg.m}</p>}

          <motion.button whileTap={{ scale: 0.97 }} onClick={buildCourse} disabled={ccBusy || !ccSubjectId}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {ccBusy ? <><Loader2 size={16} className="animate-spin" /> Construction…</> : <><BookOpen size={16} /> Construire le cours</>}
          </motion.button>

          {/* Draft tree preview */}
          {ccTree?.chapters?.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">
                Brouillon · {ccCounts?.chapters} chapitres · {ccCounts?.parts} parties · {ccCounts?.pages} pages
              </div>
              <div className="max-h-80 overflow-y-auto rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                {ccTree.chapters.map((ch, ci) => (
                  <details key={ci} className="px-3 py-2">
                    <summary className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer">
                      {ci + 1}. {ch.title}
                      <span className="ml-2 text-[10px] font-normal text-slate-400">
                        {ch.parts?.length || 0} parties · {(ch.parts || []).reduce((a, p) => a + (p.pages?.length || 0), 0)} pages
                      </span>
                    </summary>
                    {ch.subtitle && <div className="text-[11px] text-slate-400 mb-1">{ch.subtitle}</div>}
                    <div className="pl-3 space-y-1.5 mt-1">
                      {(ch.parts || []).map((pt, pi) => (
                        <div key={pi}>
                          <div className="text-xs font-semibold text-violet-500">{pt.title}</div>
                          <ul className="pl-3 list-disc text-[11px] text-slate-500 dark:text-slate-400">
                            {(pt.pages || []).map((pg, gi) => <li key={gi}>{pg.title}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={publishCourse} disabled={ccBusy}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                <Send size={15} /> Publier ce cours
              </motion.button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
