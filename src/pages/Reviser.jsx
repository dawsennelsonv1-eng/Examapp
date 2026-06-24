// src/pages/Reviser.jsx — v26
// Toggle [Quiz] [Examens].
//  - Quiz: the full quiz experience (embedded).
//  - Examens: SUBJECT-FIRST archive. Pick a matière → see the years/periods the
//    admin uploaded (single year like "2024" or a span like "2010-2023") → open
//    the PDF. Distinct "dossier / épreuves" look, unlike Cours and Quiz.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FolderOpen, FileText, Lock, Crown, ChevronRight, Loader2, Download } from "lucide-react";
import { useEffectivePlan, useEffectiveTrack } from "../hooks/useAdminAccess";
import { supabase } from "../lib/supabase";
import Quizzes from "./Quizzes";

const SUBJECT_DISPLAY = {
  mathematiques: { name: "Mathématiques", icon: "📐" },
  physique:      { name: "Physique", icon: "⚛️" },
  chimie:        { name: "Chimie", icon: "🧪" },
  biologie:      { name: "Biologie", icon: "🧬" },
  francais:      { name: "Français", icon: "📚" },
  philosophie:   { name: "Philosophie", icon: "💭" },
  sciences_sociales: { name: "Sciences Sociales", icon: "🌍" },
  creole:        { name: "Créole", icon: "🇭🇹" },
  _complet:      { name: "Examen complet", icon: "🗂️" },
};
const subjLabel = (id) => SUBJECT_DISPLAY[id]?.name || (id ? id.charAt(0).toUpperCase() + id.slice(1) : "Examen complet");
const subjIcon = (id) => SUBJECT_DISPLAY[id]?.icon || "📄";

export default function Reviser() {
  const [mode, setMode] = useState("quiz"); // quiz | examens
  const planTier = useEffectivePlan();

  return (
    <div className="pb-28 pt-3 min-h-screen bg-slate-950">
      <div className="px-4 mb-2">
        <div className="relative grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-900 ring-1 ring-slate-800">
          <motion.div layout transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 shadow-lg shadow-violet-500/30"
            style={{ left: mode === "quiz" ? 4 : "calc(50% + 0px)" }} />
          <button onClick={() => setMode("quiz")}
            className={`relative z-10 py-2.5 rounded-xl text-sm font-bold transition-colors ${mode === "quiz" ? "text-white" : "text-slate-400"}`}>Quiz</button>
          <button onClick={() => setMode("examens")}
            className={`relative z-10 py-2.5 rounded-xl text-sm font-bold transition-colors ${mode === "examens" ? "text-white" : "text-slate-400"}`}>Examens</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "quiz" ? (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Quizzes embedded />
          </motion.div>
        ) : (
          <motion.div key="examens" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <ExamsView planTier={planTier} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExamsView({ planTier }) {
  const navigate = useNavigate();
  const track = useEffectiveTrack();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState(null);   // selected subject key
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setSubject(null);
    (async () => {
      try {
        const { data } = await supabase
          .from("exams")
          .select("id, track, subject, year, period, pdf_path, premium, title")
          .eq("track", track || "NS4")
          .order("year", { ascending: false });
        if (alive) setExams(data || []);
      } catch { if (alive) setExams([]); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [track]);

  // Group by subject (null subject → "_complet").
  const groups = {};
  exams.forEach((e) => {
    const key = e.subject || "_complet";
    (groups[key] = groups[key] || []).push(e);
  });
  const subjectKeys = Object.keys(groups);

  const isLocked = (e) => e.premium && planTier !== "basic" && planTier !== "premium";

  const openPdf = async (e) => {
    if (isLocked(e)) { navigate("/paywall"); return; }
    setOpeningId(e.id);
    try {
      const { data } = await supabase.storage.from("exams").createSignedUrl(e.pdf_path, 3600);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {}
    setOpeningId(null);
  };

  if (loading) {
    return <div className="text-center py-16"><Loader2 size={26} className="animate-spin mx-auto text-violet-500" /></div>;
  }
  if (exams.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <FolderOpen size={30} className="text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Aucune épreuve disponible pour {track || "NS4"} pour l'instant.</p>
      </div>
    );
  }

  // ---- SUBJECT LIST (archive of "dossiers") ----
  if (!subject) {
    return (
      <div className="px-4 pt-1">
        <div className="flex items-center gap-2 mb-3 px-1">
          <FolderOpen size={15} className="text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Banque d'épreuves · choisis une matière</h2>
        </div>
        <div className="space-y-2.5">
          {subjectKeys.map((key, i) => {
            const list = groups[key];
            const anyLocked = list.every((e) => e.premium) && planTier === "free";
            return (
              <motion.button
                key={key}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSubject(key)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 text-left ring-1 ring-slate-800 border-l-4 border-amber-500/60"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center text-xl shrink-0">
                  {subjIcon(key)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white text-[15px]">{subjLabel(key)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {list.length} épreuve{list.length > 1 ? "s" : ""} disponible{list.length > 1 ? "s" : ""}
                  </div>
                </div>
                {anyLocked && <Lock size={14} className="text-amber-400 shrink-0" />}
                <ChevronRight size={18} className="text-slate-600 shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- PERIOD LIST for the chosen subject (paper "stamps") ----
  const list = (groups[subject] || []).slice().sort((a, b) => (b.year || 0) - (a.year || 0));
  return (
    <div className="px-4 pt-1">
      <button onClick={() => setSubject(null)} className="flex items-center gap-1 text-xs font-bold text-amber-400 mb-3">
        <ArrowLeft size={14} /> Toutes les matières
      </button>

      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-xl">{subjIcon(subject)}</div>
        <div>
          <h2 className="text-lg font-black text-white leading-tight">{subjLabel(subject)}</h2>
          <p className="text-[11px] text-slate-400">{track === "9AF" ? "9ème AF" : "NS4"} · choisis une année / période</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {list.map((e, i) => {
          const locked = isLocked(e);
          return (
            <motion.button
              key={e.id}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openPdf(e)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-left ring-1 ring-slate-700/60"
            >
              {/* period "stamp" */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 flex items-center justify-center -rotate-3">
                  <span className="text-[11px] font-black text-amber-300 leading-tight text-center px-1">{e.period || e.year}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-white truncate">Épreuve {e.period || e.year}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                  {locked ? <><Crown size={11} className="text-amber-400" /> Premium</> : <><FileText size={11} /> PDF officiel</>}
                </div>
              </div>
              {locked
                ? <Lock size={16} className="text-amber-400 shrink-0" />
                : openingId === e.id
                  ? <Loader2 size={16} className="animate-spin text-violet-400 shrink-0" />
                  : <Download size={16} className="text-slate-400 shrink-0" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
