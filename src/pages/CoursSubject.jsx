// src/pages/CoursSubject.jsx v24
// Renders a PUBLISHED course tree: Chapters → Parts → Pages.
// Tapping a page opens CoursEvent (the lesson). Chapters expand to show their
// parts; each part lists its pages as tappable lessons.

import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, Clock, Sparkles, Loader2, GraduationCap } from "lucide-react";
import { useEffectiveTrack } from "../hooks/useAdminAccess";
import { useCourseTree, chapterId, pageId } from "../hooks/useCourseTree";

const BANNERS = {
  math: "linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)",
  mathematiques: "linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)",
  physique: "linear-gradient(135deg, #2563eb 0%, #0891b2 100%)",
  chimie: "linear-gradient(135deg, #10b981 0%, #0d9488 100%)",
  biologie: "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
  francais: "linear-gradient(135deg, #f43f5e 0%, #db2777 100%)",
  sciences_sociales: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
  kreyol: "linear-gradient(135deg, #ef4444 0%, #e11d48 100%)",
  creole: "linear-gradient(135deg, #ef4444 0%, #e11d48 100%)",
};
const DEFAULT_BANNER = "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)";

export default function CoursSubject() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const track = useEffectiveTrack();
  const { tree, meta, loading } = useCourseTree(subjectId, track || "NS4");

  const [expanded, setExpanded] = useState(0); // first chapter open by default
  const [searchParams] = useSearchParams();

  // Deep link from the quiz "Mwen pa konprann": /cours/<subject>?chapter=<chapterId>
  // opens that exact chapter and scrolls it into view.
  useEffect(() => {
    const ch = searchParams.get("chapter");
    const chs = tree?.chapters || [];
    if (!ch || !chs.length) return;
    const idx = chs.findIndex((_, ci) => chapterId(subjectId, ci) === ch);
    if (idx >= 0) {
      setExpanded(idx);
      setTimeout(() => {
        const el = document.getElementById(`chapter-${idx}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 280);
    }
  }, [searchParams, tree, subjectId]);

  if (loading) {
    return (
      <div className="pt-24 flex flex-col items-center text-center">
        <Loader2 size={28} className="animate-spin text-violet-500 mb-2" />
        <div className="text-sm text-slate-400">Chargement du cours…</div>
      </div>
    );
  }

  const chapters = tree?.chapters || [];
  const banner = BANNERS[subjectId] || DEFAULT_BANNER;
  const subjectName = meta?.subjectName || subjectId;

  if (!chapters.length) {
    return (
      <div className="p-6 text-center pt-20">
        <p className="text-slate-400 text-sm">Ce cours n'est pas encore disponible.</p>
        <button onClick={() => navigate("/cours")} className="mt-3 text-violet-400 font-bold">Retour aux cours</button>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <header className="relative px-4 pt-4 pb-8 text-white rounded-b-3xl shadow-xl" style={{ background: banner }}>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate("/cours")}
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <span className="text-xs uppercase tracking-widest font-bold opacity-80">Cours</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-4xl"><GraduationCap size={40} /></span>
          <div>
            <h1 className="text-2xl font-black">{subjectName}</h1>
            <p className="text-xs opacity-90 mt-1">{chapters.length} chapitre{chapters.length > 1 ? "s" : ""}</p>
          </div>
        </div>
      </header>

      <main className="px-4 mt-4 space-y-3">
        {chapters.map((chapter, ci) => {
          const isOpen = expanded === ci;
          const pageCount = (chapter.parts || []).reduce((a, p) => a + (p.pages?.length || 0), 0);
          return (
            <motion.div
              key={ci}
              id={`chapter-${ci}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.04 }}
              className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden"
            >
              <button onClick={() => setExpanded(isOpen ? -1 : ci)} className="w-full p-4 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center text-white flex-shrink-0 font-black">
                  {ci + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{chapter.title}</div>
                  {chapter.subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{chapter.subtitle}</div>}
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                    <Clock size={10} />
                    <span>{chapter.parts?.length || 0} parties · {pageCount} pages</span>
                  </div>
                </div>
                <motion.div animate={{ rotate: isOpen ? 90 : 0 }}><ChevronRight size={18} className="text-slate-400" /></motion.div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }} className="overflow-hidden border-t border-slate-100 dark:border-slate-700">
                    <div className="p-3 space-y-3 bg-slate-50 dark:bg-slate-900/50">
                      {(chapter.parts || []).map((part, pi) => (
                        <div key={pi}>
                          <div className="text-[10px] uppercase tracking-widest font-black text-violet-500 dark:text-violet-400 px-1 mb-1.5">
                            {part.title}
                          </div>
                          <div className="space-y-2">
                            {(part.pages || []).map((page, gi) => (
                              <motion.button
                                key={gi}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(`/cours/${subjectId}/${chapterId(subjectId, ci)}/${pageId(subjectId, ci, pi, gi)}`)}
                                className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center gap-3 text-left"
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">
                                  <Sparkles size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-slate-900 dark:text-white">{page.title}</div>
                                  {page.summary && <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{page.summary}</div>}
                                </div>
                                <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </main>
    </div>
  );
}
