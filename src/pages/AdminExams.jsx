// src/pages/AdminExams.jsx — v24
// Admin-only: upload past-exam PDFs to the private 'exams' Supabase Storage
// bucket + an 'exams' metadata row. Lists uploaded exams and allows delete.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Loader2, Trash2, FileText, Crown, Sparkles, GraduationCap, BookOpen, Send, X } from "lucide-react";
import { useAdminAccess } from "../hooks/useAdminAccess";
import { useExams } from "../hooks/useExams";
import { supabase } from "../lib/supabase";
import { SUBJECTS as COURS_SUBJECTS } from "../utils/coursData";

const TRACKS = ["9AF", "NS4"];
const SUBJECTS = ["mathematiques", "physique", "chimie", "biologie", "francais", "sciences_sociales", "philosophie", "creole"];

export default function AdminExams() {
  // Attaches the signed-in admin's Supabase token to every admin API call.
  const postAdmin = async (task, body) => {
    let token = null;
    try {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token || null;
      if (!token) {
        // Session missing/expired locally — force a refresh before giving up.
        const r = await supabase.auth.refreshSession();
        token = r?.data?.session?.access_token || null;
      }
    } catch {}
    return fetch(`/api/content?task=${task}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body || {}),
    });
  };
  const navigate = useNavigate();
  const { isAdmin, loading: accessLoading } = useAdminAccess();
  const { exams, loading, reload } = useExams();

  const [year, setYear] = useState(String(new Date().getFullYear())); // free text: "2024" or "2010-2023"
  const [track, setTrack] = useState("NS4");
  const [subject, setSubject] = useState("");
  const [premium, setPremium] = useState(true);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // ----- Quiz generation (driven by the PUBLISHED course_tree) -----
  const [qTrack, setQTrack] = useState("NS4");
  const [qSubjectId, setQSubjectId] = useState("");
  const [qChapterId, setQChapterId] = useState("");
  const [qCount, setQCount] = useState(30);
  const [qBusy, setQBusy] = useState(false);
  const [qProgress, setQProgress] = useState(0);
  const [qMsg, setQMsg] = useState(null);
  const [qPubSubjects, setQPubSubjects] = useState([]); // subjects with a published course
  const [qChapters, setQChapters] = useState([]);        // chapters from the published tree
  const [qChLoading, setQChLoading] = useState(false);

  // Subjects that actually have a PUBLISHED course for the chosen class.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await postAdmin("course_list", { track: qTrack });
        const j = await r.json();
        const pub = (j.data?.courses || [])
          .filter((c) => c.status === "published")
          .map((c) => ({ id: c.subject, name: c.subject_name || c.subject }));
        if (!cancelled) setQPubSubjects(pub);
      } catch { if (!cancelled) setQPubSubjects([]); }
    })();
    return () => { cancelled = true; };
  }, [qTrack]);

  // Chapters of the selected subject, pulled from its published tree.
  useEffect(() => {
    let cancelled = false;
    setQChapters([]); setQChapterId("");
    if (!qSubjectId) return;
    (async () => {
      setQChLoading(true);
      try {
        const r = await postAdmin("course_get", { track: qTrack, subjectId: qSubjectId });
        const j = await r.json();
        const chapters = (j.data?.tree?.chapters || []).map((ch, ci) => ({
          id: `${qSubjectId}__c${ci}`,
          title: ch.title,
          // points = every page (title + summary) across the chapter's parts
          points: (ch.parts || []).flatMap((p) =>
            (p.pages || []).map((pg) => `${pg.title}${pg.summary ? ` — ${pg.summary}` : ""}`)
          ),
        }));
        if (!cancelled) setQChapters(chapters);
      } catch { if (!cancelled) setQChapters([]); }
      finally { if (!cancelled) setQChLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [qSubjectId, qTrack]);

  const qSubjects = qPubSubjects;
  const qSubject = qPubSubjects.find((s) => s.id === qSubjectId) || null;
  const qChapter = qChapters.find((c) => c.id === qChapterId) || null;

  const generateQuizzes = async () => {
    setQMsg(null);
    if (!qSubjectId) { setQMsg({ t: "err", m: "Choisis une matière (cours publié)." }); return; }
    if (!qChapterId) { setQMsg({ t: "err", m: "Choisis un chapitre." }); return; }
    setQBusy(true);
    setQProgress(0);
    const target = Math.max(1, Math.min(Number(qCount) || 30, 200));
    const points = qChapter?.points || [];
    let done = 0;
    let stored = 0;
    try {
      // Generate in batches of 15 so the serverless function never times out.
      while (done < target) {
        const batchN = Math.min(15, target - done);
        const r = await postAdmin("gen_quiz", {
            track: qTrack,
            subject: qSubjectId,
            subjectName: qSubject?.name || qSubjectId,
            topic: qChapter?.title || "",
            chapterId: qChapterId,
            points,
            count: batchN,
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

  // ----- Admin-managed subjects (single source for matière everywhere) -----
  const [dbSubjects, setDbSubjects] = useState([]);     // [{id,track,name,position}]
  const [smTrack, setSmTrack] = useState("NS4");
  const [newSubjName, setNewSubjName] = useState("");
  const [subjBusy, setSubjBusy] = useState(false);
  const [subjMsg, setSubjMsg] = useState(null);

  const loadSubjects = async () => {
    try {
      const r = await postAdmin("subjects_list", {});
      const j = await r.json();
      setDbSubjects(Array.isArray(j.data) ? j.data : []);
    } catch { setDbSubjects([]); }
  };
  useEffect(() => { loadSubjects(); }, []); // eslint-disable-line

  const subjectsForTrack = (tk) => dbSubjects.filter((s) => s.track === tk);

  // Exam-upload picker: use the admin-managed DB subjects for the chosen track,
  // falling back to the built-in list only while the DB list is still empty.
  const examSubjects = (() => {
    const db = subjectsForTrack(track);
    return db.length
      ? db.map((s) => ({ id: s.id, name: s.name }))
      : SUBJECTS.map((s) => ({ id: s, name: s.charAt(0).toUpperCase() + s.slice(1) }));
  })();

  const addSubject = async () => {
    const name = newSubjName.trim();
    if (!name) return;
    setSubjBusy(true); setSubjMsg(null);
    try {
      const r = await postAdmin("subject_add", { track: smTrack, name });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
      setNewSubjName("");
      await loadSubjects();
    } catch (err) {
      setSubjMsg({ t: "err", m: err?.message || "Échec." });
    } finally { setSubjBusy(false); }
  };

  const removeSubject = async (id) => {
    setSubjBusy(true); setSubjMsg(null);
    try {
      const r = await postAdmin("subject_remove", { track: smTrack, id });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
      await loadSubjects();
    } catch (err) {
      setSubjMsg({ t: "err", m: err?.message || "Échec." });
    } finally { setSubjBusy(false); }
  };

  const importDefaultSubjects = async () => {
    setSubjBusy(true); setSubjMsg(null);
    try {
      const defaults = COURS_SUBJECTS.filter((s) => !s.tracks || s.tracks.includes(smTrack));
      for (const s of defaults) {
        await postAdmin("subject_add", { track: smTrack, id: s.id, name: s.name });
      }
      await loadSubjects();
      setSubjMsg({ t: "ok", m: `${defaults.length} matière(s) importée(s).` });
    } catch (err) {
      setSubjMsg({ t: "err", m: err?.message || "Échec de l'import." });
    } finally { setSubjBusy(false); }
  };

  // Course builder matière list: prefer DB subjects; fall back to the hardcoded
  // defaults only while the DB list for this track is still empty.
  const ccDb = subjectsForTrack(ccTrack);
  const ccSubjects = ccDb.length
    ? ccDb.map((s) => ({ id: s.id, name: s.name }))
    : COURS_SUBJECTS.filter((s) => !s.tracks || s.tracks.includes(ccTrack));
  const ccSubject = ccSubjects.find((s) => s.id === ccSubjectId) || null;

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
          const r = await postAdmin("course_ocr", { examId: exams[i].id });
          const j = await r.json();
          if (r.ok && j.data?.text) examText += `\n\n--- Examen ${i + 1} ---\n${j.data.text}`;
        } catch {}
      }

      // 3. Build the tree (syllabus + exam text).
      setCcStage(exams.length ? "Construction du cours (examens + programme)…" : "Construction du cours (programme MENFP)…");
      const r = await postAdmin("build_course", {
          track: ccTrack, subjectId: ccSubjectId,
          subjectName: ccSubject?.name || ccSubjectId, examText,
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
      loadCourseList();
    }
  };

  const publishCourse = async () => {
    setCcMsg(null); setCcBusy(true);
    try {
      const r = await postAdmin("course_publish", { track: ccTrack, subjectId: ccSubjectId });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
      setCcMsg({ t: "ok", m: "Cours publié ✓ — visible par les élèves." });
      loadCourseList();
    } catch (err) {
      setCcMsg({ t: "err", m: err?.message || "Échec de la publication." });
    } finally { setCcBusy(false); }
  };

  // ----- Course history (status + exam count + actions per subject) -----
  const [ccList, setCcList] = useState(null);
  const [ccListBusy, setCcListBusy] = useState(false);

  const loadCourseList = async () => {
    setCcListBusy(true);
    try {
      const r = await postAdmin("course_list", { track: ccTrack });
      const j = await r.json();
      setCcList(j.data || null);
    } catch { setCcList(null); }
    finally { setCcListBusy(false); }
  };

  useEffect(() => { loadCourseList(); /* on mount + track change */ }, [ccTrack]); // eslint-disable-line

  const courseFor = (subjectId) =>
    (ccList?.courses || []).find((c) => c.subject === subjectId) || null;
  const examCountFor = (subjectId) =>
    (ccList?.examBySubject?.[subjectId] || 0) + (ccList?.completeCount || 0);

  const reloadDraft = async (subjectId, subjectName) => {
    setCcMsg(null); setCcBusy(true); setCcTree(null); setCcCounts(null);
    setCcSubjectId(subjectId);
    setCcStage("Chargement du cours enregistré…");
    try {
      const r = await postAdmin("course_get", { track: ccTrack, subjectId });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
      if (!j.data?.tree) { setCcMsg({ t: "err", m: "Aucun cours enregistré pour cette matière." }); return; }
      setCcTree(j.data.tree);
      setCcCounts(j.data.counts);
      setCcMsg({ t: "ok", m: `Chargé : « ${subjectName} » (${j.data.status}, v${j.data.version}).` });
    } catch (err) {
      setCcMsg({ t: "err", m: err?.message || "Échec du chargement." });
    } finally { setCcBusy(false); setCcStage(""); }
  };

  const togglePublish = async (subjectId, currentStatus) => {
    setCcBusy(true); setCcMsg(null);
    const task = currentStatus === "published" ? "course_unpublish" : "course_publish";
    try {
      const r = await fetch(`/api/content?task=${task}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: ccTrack, subjectId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
      setCcMsg({ t: "ok", m: currentStatus === "published" ? "Cours dépublié (caché aux élèves)." : "Cours publié ✓" });
      loadCourseList();
    } catch (err) {
      setCcMsg({ t: "err", m: err?.message || "Échec." });
    } finally { setCcBusy(false); }
  };

  const rebuildSubject = (subjectId) => {
    setCcSubjectId(subjectId);
    setTimeout(buildCourse, 0); // build with the selected subject
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
      const periodText = String(year).trim() || String(new Date().getFullYear());
      const startYear = parseInt((periodText.match(/\d{4}/) || [String(new Date().getFullYear())])[0], 10) || new Date().getFullYear();
      const signResp = await postAdmin("exam_sign", { track, year: startYear, subject: subject || "" });
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
      const title = `${subject ? subject.charAt(0).toUpperCase() + subject.slice(1) + " " : ""}${track} ${periodText}`;
      const ins = await supabase.from("exams").insert({
        year: startYear, period: periodText, track, subject: subject || null, title,
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
              <span className="text-[11px] text-slate-500 block mb-1">Année / période</span>
              <input type="text" value={year} onChange={(e) => setYear(e.target.value)}
                placeholder="2024  ou  2010-2023"
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
              {examSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{e.title || `${e.track} ${e.period || e.year}`}</div>
                    <div className="text-[10px] text-slate-500">{e.track} · {e.period || e.year}{e.premium ? " · Premium" : " · Gratuit"}</div>
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
            <span className="text-[11px] text-slate-500 block mb-1">Matière (cours publié)</span>
            <select value={qSubjectId} onChange={(e) => { setQSubjectId(e.target.value); setQChapterId(""); }}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">{qSubjects.length ? "— Choisir une matière —" : "Aucun cours publié pour cette classe"}</option>
              {qSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <label className="text-sm block">
            <span className="text-[11px] text-slate-500 block mb-1">Chapitre</span>
            <select value={qChapterId} onChange={(e) => setQChapterId(e.target.value)} disabled={!qSubjectId || qChLoading}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50">
              <option value="">{!qSubjectId ? "Choisis d'abord une matière" : qChLoading ? "Chargement des chapitres…" : qChapters.length ? "— Choisir un chapitre —" : "Aucun chapitre dans ce cours"}</option>
              {qChapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            {qChapter && <span className="text-[10px] text-slate-400 mt-1 block">{qChapter.points?.length || 0} pages couvertes</span>}
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

        {/* ===== Matières — admin-managed subject list per track ===== */}
        <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 space-y-3">
          <h3 className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-1.5">
            <BookOpen size={12} className="text-violet-500" /> Matières — gérer par classe
          </h3>

          <div className="flex gap-2">
            {["9AF", "NS4"].map((tk) => (
              <button key={tk} onClick={() => setSmTrack(tk)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${smTrack === tk ? "bg-violet-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                {tk}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {subjectsForTrack(smTrack).length === 0 && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-center">
                <p className="text-[12px] text-slate-400 mb-2">Aucune matière pour {smTrack}.</p>
                <button onClick={importDefaultSubjects} disabled={subjBusy}
                  className="text-[12px] font-bold text-violet-600 dark:text-violet-300 disabled:opacity-50">
                  Importer les matières par défaut
                </button>
              </div>
            )}
            {subjectsForTrack(smTrack).map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{s.name}</span>
                <span className="text-[10px] text-slate-400">{s.id}</span>
                <button onClick={() => removeSubject(s.id)} disabled={subjBusy}
                  className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-300 flex items-center justify-center disabled:opacity-50">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input value={newSubjName} onChange={(e) => setNewSubjName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addSubject(); }}
              placeholder={`Nouvelle matière (${smTrack})`}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <button onClick={addSubject} disabled={subjBusy || !newSubjName.trim()}
              className="px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-bold disabled:opacity-50">
              Ajouter
            </button>
          </div>

          {subjMsg && (
            <div className={`text-[12px] font-semibold ${subjMsg.t === "ok" ? "text-emerald-500" : "text-red-500"}`}>{subjMsg.m}</div>
          )}
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

          {/* Per-subject history: status + exam count + actions */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">État des cours · {ccTrack}</div>
              <button onClick={loadCourseList} disabled={ccListBusy} className="text-[10px] text-violet-500 font-bold disabled:opacity-50">
                {ccListBusy ? "…" : "↻ Actualiser"}
              </button>
            </div>
            {ccSubjects.map((s) => {
              const c = courseFor(s.id);
              const exCount = examCountFor(s.id);
              const status = c?.status;
              return (
                <div key={s.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        {status === "published" ? (
                          <span className="text-emerald-500 font-bold">● Publié v{c.version}</span>
                        ) : status === "draft" ? (
                          <span className="text-amber-500 font-bold">● Brouillon v{c.version}</span>
                        ) : (
                          <span className="text-slate-400">— Aucun cours</span>
                        )}
                        <span>· {exCount} examen{exCount > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c && (
                      <button onClick={() => reloadDraft(s.id, s.name)} disabled={ccBusy}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold disabled:opacity-50">
                        Revoir
                      </button>
                    )}
                    <button onClick={() => rebuildSubject(s.id)} disabled={ccBusy}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-bold disabled:opacity-50">
                      {c ? "Reconstruire" : "Construire"}
                    </button>
                    {c && (
                      <button onClick={() => togglePublish(s.id, status)} disabled={ccBusy}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-bold disabled:opacity-50 ${status === "published" ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"}`}>
                        {status === "published" ? "Dépublier" : "Publier"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

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
