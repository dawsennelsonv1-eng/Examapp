// src/pages/Admin.jsx
// Hidden admin page at /admin — upload past exams, generate quizzes,
// manage the system. Access protected by admin token.

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Upload, Lock, RefreshCw, CheckCircle2, XCircle,
  Loader2, Database, Calendar, FileText,
} from "lucide-react";
import {
  generateQuizzesForSubject,
  getAllCachedSubjects,
  clearQuizCache,
  setAdminToken,
} from "../services/quizService";

const SUBJECTS_BY_TRACK = {
  "9AF": ["Mathématiques", "Physique", "Chimie", "Sciences Sociales", "Français", "Créole"],
  "NS4": ["Mathématiques", "Physique", "Chimie", "Biologie", "Sciences Sociales", "Philosophie", "Français"],
};

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [track, setTrack] = useState("NS4");
  const [selectedSubject, setSelectedSubject] = useState("Mathématiques");
  const [pastExamsText, setPastExamsText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cachedSubjects, setCachedSubjects] = useState([]);

  useEffect(() => {
    if (authed) {
      setCachedSubjects(getAllCachedSubjects());
    }
  }, [authed, result]);

  const handleAuth = () => {
    if (adminInput.trim().length < 8) {
      setError("Token trop court");
      return;
    }
    setAdminToken(adminInput.trim());
    setAuthed(true);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!pastExamsText.trim() || pastExamsText.length < 200) {
      setError("Colle au moins 200 caractères d'examens passés");
      return;
    }
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const data = await generateQuizzesForSubject({
        subject: selectedSubject,
        track,
        pastExamsText,
        count: 50,
        onProgress: setProgress,
      });
      setResult({
        subject: selectedSubject,
        count: data.questions.length,
        expiresAt: data.expiresAt,
      });
      setPastExamsText("");
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPastExamsText(ev.target.result || "");
    reader.readAsText(file);
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center mb-4">
            <Lock size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Admin Laureat AI
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Entre ton token administrateur pour continuer.
          </p>
          <input
            type="password"
            value={adminInput}
            onChange={(e) => setAdminInput(e.target.value)}
            placeholder="Admin token"
            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          />
          {error && (
            <p className="text-xs text-red-500 mb-3">{error}</p>
          )}
          <button
            onClick={handleAuth}
            className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold"
          >
            Continuer
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <h1 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Database size={20} className="text-violet-600" />
          Admin Console
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gestion des quiz et examens
        </p>
      </header>

      {/* Cached quizzes */}
      <section className="px-4 mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Quiz en cache
        </h2>
        {cachedSubjects.length === 0 ? (
          <div className="text-sm text-slate-500 italic p-4 rounded-xl bg-white dark:bg-slate-900">
            Aucun quiz généré encore.
          </div>
        ) : (
          <div className="space-y-2">
            {cachedSubjects.map((s) => (
              <div
                key={s.subject}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FileText size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    {s.subject}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {s.count} questions · expire {formatDate(s.expiresAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {cachedSubjects.length > 0 && (
          <button
            onClick={() => {
              clearQuizCache();
              setCachedSubjects([]);
            }}
            className="mt-3 text-xs text-red-500 underline"
          >
            Vider le cache
          </button>
        )}
      </section>

      {/* Generate new quiz */}
      <section className="px-4 mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Générer un quiz
        </h2>

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4">
          {/* Track */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Niveau
            </label>
            <div className="flex gap-2">
              {["9AF", "NS4"].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTrack(t);
                    setSelectedSubject(SUBJECTS_BY_TRACK[t][0]);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    track === t
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Matière
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
            >
              {SUBJECTS_BY_TRACK[track].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Past exams text */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Examens des 3 dernières années
            </label>
            <input
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              className="text-xs text-slate-600 dark:text-slate-400 mb-2 block"
            />
            <textarea
              value={pastExamsText}
              onChange={(e) => setPastExamsText(e.target.value)}
              placeholder="Colle ici le texte des examens MENFP 2023, 2024, 2025... (ou utilise le bouton ci-dessus pour charger un fichier)"
              rows={8}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="text-[10px] text-slate-500 mt-1">
              {pastExamsText.length} caractères
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || pastExamsText.length < 200}
            className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {progress || "Génération..."}
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Générer 50 questions
              </>
            )}
          </button>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300">
              <XCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                {result.count} questions générées pour {result.subject}. Expire le {formatDate(result.expiresAt)}.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
