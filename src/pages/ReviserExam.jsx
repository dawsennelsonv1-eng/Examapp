// src/pages/ReviserExam.jsx v22
// Choose a subject → see the real past-exam PDFs for that subject (uploaded by
// admin). No mock exercises / "table des matières".

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Calendar, Download, Loader2 } from "lucide-react";
import { useExams } from "../hooks/useExams";

const SUBJECT_DISPLAY = {
  mathematiques: { name: "Mathématiques", icon: "📐", color: "from-violet-500 to-indigo-600" },
  physique:      { name: "Physique", icon: "⚛️", color: "from-blue-500 to-cyan-600" },
  chimie:        { name: "Chimie", icon: "🧪", color: "from-emerald-500 to-teal-600" },
  biologie:      { name: "Biologie", icon: "🧬", color: "from-green-500 to-emerald-600" },
  francais:      { name: "Français", icon: "📚", color: "from-rose-500 to-pink-600" },
  philosophie:   { name: "Philosophie", icon: "💭", color: "from-purple-500 to-violet-600" },
  sciences_sociales: { name: "Sciences Sociales", icon: "🌍", color: "from-amber-500 to-orange-600" },
  creole:        { name: "Créole", icon: "🇭🇹", color: "from-red-500 to-rose-600" },
};

export default function ReviserExam() {
  const { year, track } = useParams();
  const navigate = useNavigate();
  const { exams, getPdfUrl } = useExams();

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [openingPdf, setOpeningPdf] = useState(null);

  const examPdfs = (exams || []).filter(
    (e) => String(e.year) === String(year) && e.track === track
  );

  // PDFs for the chosen subject: subject-specific + "examen complet" (no subject).
  const pdfsForSubject = (subjId) =>
    examPdfs.filter((e) => !e.subject || e.subject === subjId);

  const openPdf = async (exam) => {
    setOpeningPdf(exam.id);
    const url = await getPdfUrl(exam.pdf_path);
    setOpeningPdf(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const subjects = track === "9AF"
    ? ["mathematiques", "francais", "sciences_sociales", "creole"]
    : ["mathematiques", "physique", "chimie", "biologie", "francais", "philosophie"];

  return (
    <div className="pb-28">
      <header className="relative px-4 pt-4 pb-6 text-white rounded-b-3xl shadow-xl bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => selectedSubject ? setSelectedSubject(null) : navigate("/reviser")}
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">Examen national</div>
        </div>
        <div className="flex items-end gap-3">
          <Calendar size={28} />
          <h1 className="text-3xl font-black">{year}</h1>
          <span className="text-xs uppercase tracking-widest font-bold bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {track === "9AF" ? "9ème AF" : "NS4"}
          </span>
        </div>
        <p className="text-xs opacity-90 mt-2">Choisis une matière pour voir les épreuves</p>
      </header>

      <main className="px-4 mt-4">
        {!selectedSubject ? (
          <section>
            <h2 className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-3 px-1">
              Choisis une matière
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {subjects.map((subjId, i) => {
                const display = SUBJECT_DISPLAY[subjId] || { name: subjId, icon: "📚", color: "from-slate-500 to-slate-700" };
                const count = pdfsForSubject(subjId).length;
                return (
                  <motion.button
                    key={subjId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelectedSubject(subjId)}
                    className="relative rounded-2xl overflow-hidden shadow-md text-left"
                  >
                    <div className={`bg-gradient-to-br ${display.color} p-4 text-white`}>
                      <div className="text-3xl mb-2">{display.icon}</div>
                      <div className="font-bold text-sm">{display.name}</div>
                      <div className="text-[10px] opacity-90 mt-0.5">
                        {count} épreuve{count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        ) : (
          <SubjectExams
            subjectId={selectedSubject}
            pdfs={pdfsForSubject(selectedSubject)}
            openingPdf={openingPdf}
            onOpen={openPdf}
            onBack={() => setSelectedSubject(null)}
          />
        )}
      </main>
    </div>
  );
}

function SubjectExams({ subjectId, pdfs, openingPdf, onOpen, onBack }) {
  const display = SUBJECT_DISPLAY[subjectId] || { name: subjectId, icon: "📚", color: "from-slate-500 to-slate-700" };
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 mb-3">
        <ArrowLeft size={14} />Retour aux matières
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{display.icon}</span>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">{display.name}</h2>
      </div>

      {pdfs.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={28} className="text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucune épreuve disponible pour cette matière.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pdfs.map((exam) => (
            <button key={exam.id} onClick={() => onOpen(exam)}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center gap-3 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                {openingPdf === exam.id ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-bold text-sm truncate">{exam.title || `Examen ${exam.track} ${exam.year}`}</div>
                <div className="text-[11px] opacity-80">Toucher pour ouvrir le PDF</div>
              </div>
              <Download size={18} className="opacity-80" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
