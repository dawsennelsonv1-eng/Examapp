// src/pages/ReviserExam.jsx v21
// Opens a specific past exam → list of subjects in that exam → tap to see exercises.
// For demo: shows the structure. Actual exam content would be admin-curated.

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, FileText, ChevronRight, Calendar,
  CheckCircle2, MessageCircle, Sparkles, Download, Loader2,
} from "lucide-react";
import { useExams } from "../hooks/useExams";

// Subject icons + colors for the viewer
const SUBJECT_DISPLAY = {
  mathematiques: { name: "Mathématiques", icon: "📐", color: "from-violet-500 to-indigo-600" },
  physique:      { name: "Physique", icon: "⚛️", color: "from-blue-500 to-cyan-600" },
  chimie:        { name: "Chimie", icon: "🧪", color: "from-emerald-500 to-teal-600" },
  biologie:      { name: "Biologie", icon: "🧬", color: "from-green-500 to-emerald-600" },
  francais:      { name: "Français", icon: "📚", color: "from-rose-500 to-pink-600" },
  philosophie:   { name: "Philosophie", icon: "💭", color: "from-purple-500 to-violet-600" },
  sciences_sociales: { name: "Sciences Sociales", icon: "🌍", color: "from-amber-500 to-orange-600" },
  creole:        { name: "Kreyòl", icon: "🇭🇹", color: "from-red-500 to-rose-600" },
};

// Sample exercises per subject — admin will replace with real exam content
const SAMPLE_EXERCISES = {
  physique: [
    { id: "ex1", number: "1", points: 5, preview: "Une voiture roule à 90 km/h pendant 2h..." },
    { id: "ex2", number: "2", points: 6, preview: "Un objet de 2 kg tombe d'une hauteur de 10 m..." },
    { id: "ex3", number: "3", points: 9, preview: "Un circuit comprend une résistance R..." },
  ],
  mathematiques: [
    { id: "ex1", number: "1", points: 5, preview: "Soit f(x) = 2x² - 3x + 1..." },
    { id: "ex2", number: "2", points: 7, preview: "Résoudre dans ℝ l'équation..." },
    { id: "ex3", number: "3", points: 8, preview: "Dans un triangle ABC..." },
  ],
};

export default function ReviserExam() {
  const { year, track } = useParams();
  const navigate = useNavigate();
  const { exams, getPdfUrl } = useExams();

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [openingPdf, setOpeningPdf] = useState(null);

  // PDFs uploaded by admin for this exam (matching year + track).
  const examPdfs = (exams || []).filter(
    (e) => String(e.year) === String(year) && e.track === track
  );

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
          <button onClick={() => navigate("/reviser")}
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">Examen national</div>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <Calendar size={28} />
          <h1 className="text-3xl font-black">{year}</h1>
          <span className="text-xs uppercase tracking-widest font-bold bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {track === "9AF" ? "9ème AF" : "NS4"}
          </span>
        </div>
        <p className="text-xs opacity-90 mt-2">{subjects.length} matières · épreuves complètes</p>
      </header>

      <main className="px-4 mt-4">
        {/* Real exam PDFs uploaded by admin for this year/track */}
        {examPdfs.length > 0 && (
          <section className="mb-4">
            <h2 className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-2 px-1">
              Épreuves officielles (PDF)
            </h2>
            <div className="space-y-2">
              {examPdfs.map((exam) => (
                <button key={exam.id} onClick={() => openPdf(exam)}
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
          </section>
        )}

        {!selectedSubject ? (
          <section>
            <h2 className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-3 px-1">
              Choisis une matière
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {subjects.map((subjId, i) => {
                const display = SUBJECT_DISPLAY[subjId] || { name: subjId, icon: "📚", color: "from-slate-500 to-slate-700" };
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
                        {(SAMPLE_EXERCISES[subjId]?.length || 3)} exercices
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        ) : (
          <ExerciseList
            subjectId={selectedSubject}
            year={year}
            track={track}
            onBack={() => setSelectedSubject(null)}
          />
        )}
      </main>
    </div>
  );
}

function ExerciseList({ subjectId, year, track, onBack }) {
  const navigate = useNavigate();
  const display = SUBJECT_DISPLAY[subjectId];
  const exercises = SAMPLE_EXERCISES[subjectId] || SAMPLE_EXERCISES.physique;

  const handleSolveExercise = (ex) => {
    // Push the exercise to the scan flow with prefilled text
    const exerciseData = {
      enonce: ex.preview,
      subject: display?.name,
      examYear: year,
      examTrack: track,
      examExercise: ex.number,
      timestamp: Date.now(),
    };
    sessionStorage.setItem("laureat.pendingExercise", JSON.stringify(exerciseData));
    navigate("/classe?new=1");
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 mb-3">
        <ArrowLeft size={14} />Retour aux matières
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{display?.icon}</span>
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{display?.name}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Examen {year} · {track === "9AF" ? "9ème AF" : "NS4"}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {exercises.map((ex, i) => (
          <motion.button
            key={ex.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSolveExercise(ex)}
            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center gap-3 text-left ring-1 ring-slate-100 dark:ring-slate-700"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${display?.color} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
              <span className="font-black text-lg">{ex.number}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-slate-900 dark:text-white">Exercice {ex.number}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                  {ex.points} pts
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {ex.preview}
              </p>
            </div>
            <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
          </motion.button>
        ))}
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-4 leading-relaxed">
        💡 Tape un exercice → le prof t'accompagne dans la résolution
      </p>
    </div>
  );
}
