// src/pages/ExamVault.jsx
// MENFP past exam archive — year-first timeline.
// Visually distinct from Matières: vertical timeline, not a grid.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, AlertTriangle, FileText, Clock, Download,
  X, ChevronRight, CheckCircle2, Circle,
} from "lucide-react";
import { EXAM_YEARS } from "../data/pastExams";

export default function ExamVault() {
  const [selectedYear, setSelectedYear] = useState(null);

  return (
    <div className="pb-28">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Archives MENFP
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Anciens examens classés par année
        </p>
      </div>

      {/* Vertical timeline */}
      <div className="px-4 relative">
        {/* Vertical line */}
        <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 via-violet-400 to-transparent" />

        <div className="space-y-4">
          {EXAM_YEARS.map((yearData, i) => (
            <YearCard
              key={yearData.year}
              yearData={yearData}
              delay={i * 0.08}
              onClick={() => setSelectedYear(yearData)}
            />
          ))}
        </div>
      </div>

      {/* Year detail modal */}
      <AnimatePresence>
        {selectedYear && (
          <YearDetail yearData={selectedYear} onClose={() => setSelectedYear(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function YearCard({ yearData, delay, onClick }) {
  const availablePapers = yearData.papers.filter((p) => p.available).length;
  const totalPapers = yearData.papers.length;
  const hasTraps = yearData.traps?.length > 0;

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-start gap-4 text-left relative"
    >
      {/* Timeline dot */}
      <div className="relative flex-shrink-0 pt-3">
        <div className={`w-6 h-6 rounded-full ring-4 ring-slate-50 dark:ring-slate-950 flex items-center justify-center ${
          yearData.complete ? "bg-violet-600" : "bg-slate-400"
        }`}>
          {yearData.complete ? (
            <CheckCircle2 size={14} className="text-white" strokeWidth={3} />
          ) : (
            <Circle size={14} className="text-white" />
          )}
        </div>
      </div>

      {/* Card content */}
      <div className="flex-1 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {yearData.year}
              </h3>
              {yearData.label && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400">
                  {yearData.label}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {yearData.session}
            </p>
          </div>
          <ChevronRight size={18} className="text-slate-400 mt-1 flex-shrink-0" />
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
          {yearData.description}
        </p>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <FileText size={13} />
            <span className="font-semibold">{availablePapers}/{totalPapers} matières</span>
          </div>
          {hasTraps && (
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={13} />
              <span className="font-semibold">{yearData.traps.length} piège{yearData.traps.length > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function YearDetail({ yearData, onClose }) {
  const [activeTab, setActiveTab] = useState("papers"); // papers | traps

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-violet-200 mb-1">
                <Calendar size={12} /> Session
              </div>
              <h2 className="text-3xl font-black">{yearData.year}</h2>
              <p className="text-sm text-white/80 mt-1">{yearData.session}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-white/10 rounded-xl">
            <button
              onClick={() => setActiveTab("papers")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "papers" ? "bg-white text-violet-700" : "text-white/80"
              }`}
            >
              <FileText size={14} className="inline mr-1" />
              Épreuves ({yearData.papers.filter((p) => p.available).length})
            </button>
            <button
              onClick={() => setActiveTab("traps")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "traps" ? "bg-white text-violet-700" : "text-white/80"
              }`}
            >
              <AlertTriangle size={14} className="inline mr-1" />
              Pièges ({yearData.traps?.length || 0})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === "papers" && (
            <div className="space-y-2">
              {yearData.papers.map((paper, i) => (
                <motion.div
                  key={paper.subject}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 p-3.5 rounded-xl ${
                    paper.available
                      ? "bg-slate-50 dark:bg-slate-800"
                      : "bg-slate-50/50 dark:bg-slate-800/50 opacity-60"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    paper.available
                      ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                  }`}>
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">
                      {paper.subject}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Clock size={11} /> {paper.duration}
                      </span>
                      {paper.available && (
                        <span>{paper.pages} page{paper.pages > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                  {paper.available ? (
                    <button className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                      <Download size={16} />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Indisponible</span>
                  )}
                </motion.div>
              ))}
              <div className="text-center text-xs text-slate-400 py-3">
                Les PDF seront disponibles prochainement
              </div>
            </div>
          )}

          {activeTab === "traps" && (
            <div className="space-y-3">
              {yearData.traps && yearData.traps.length > 0 ? (
                <>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 p-3 flex items-start gap-2 mb-3">
                    <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      Les examinateurs MENFP utilisent ces pièges chaque année. Connais-les.
                    </p>
                  </div>
                  {yearData.traps.map((trap, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl bg-white dark:bg-slate-800 border-l-4 border-amber-500 p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          {trap.subject}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white mb-1.5">
                        {trap.question}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        ⚠️ {trap.tip}
                      </p>
                    </motion.div>
                  ))}
                </>
              ) : (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Pas de pièges recensés pour cette année.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
