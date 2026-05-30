// src/pages/CoursSubject.jsx v20
// Lists the chapters for a subject. Each chapter is expandable to show its
// events/points. Tapping an event opens the detailed view (CoursEvent page).

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronRight, ChevronDown, Clock,
  Sparkles, HelpCircle, Lock,
} from "lucide-react";
import { getSubject, getChapters } from "../utils/coursData";

export default function CoursSubject() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const subject = getSubject(subjectId);
  const chapters = getChapters(subjectId);

  const [expandedChapter, setExpandedChapter] = useState(null);

  if (!subject) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Matière introuvable.</p>
        <button onClick={() => navigate("/cours")} className="mt-3 text-violet-600 font-bold">Retour aux cours</button>
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Banner */}
      <header className="relative px-4 pt-4 pb-8 text-white rounded-b-3xl shadow-xl" style={{ background: subject.banner }}>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate("/cours")}
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <span className="text-xs uppercase tracking-widest font-bold opacity-80">Cours</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-5xl">{subject.icon}</span>
          <div>
            <h1 className="text-2xl font-black">{subject.name}</h1>
            <p className="text-xs opacity-90 mt-1">{chapters.length} chapitre{chapters.length > 1 ? "s" : ""}</p>
          </div>
        </div>
      </header>

      <main className="px-4 mt-4 space-y-3">
        {chapters.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            <p>Aucun chapitre disponible pour cette matière encore.</p>
            <p className="text-xs mt-2 opacity-70">Bientôt disponible.</p>
          </div>
        ) : (
          chapters.map((chapter, i) => {
            const isExpanded = expandedChapter === chapter.id;
            return (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedChapter(isExpanded ? null : chapter.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white flex-shrink-0 font-black`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{chapter.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{chapter.subtitle}</div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                      <Clock size={10} />
                      <span>{chapter.duration}</span>
                      <span className="mx-1">•</span>
                      <span>{chapter.events?.length || 0} leçons</span>
                    </div>
                  </div>
                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                    <ChevronRight size={18} className="text-slate-400" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden border-t border-slate-100 dark:border-slate-700"
                    >
                      <div className="p-3 space-y-2 bg-slate-50 dark:bg-slate-900/50">
                        {chapter.events.map((event, j) => (
                          <motion.button
                            key={event.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: j * 0.04 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(`/cours/${subjectId}/${chapter.id}/${event.id}`)}
                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center gap-3 text-left"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">
                              {event.type === "quiz" ? <HelpCircle size={15} /> : <Sparkles size={15} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white">{event.title}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{event.summary}</div>
                            </div>
                            {event.type === "quiz" && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                Quiz
                              </span>
                            )}
                            <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </main>
    </div>
  );
}
