// src/pages/Classroom.jsx
// v17: Adds delete-session button on each card (long-press or visible trash icon).

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, PencilRuler, Sparkles, Plus, ChevronRight,
  GraduationCap, HelpCircle, Trash2,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useClassroomSessions } from "../hooks/useClassroom";
import { useApp } from "../contexts/AppContext";
import ClassroomSession from "../components/classroom/ClassroomSession";

export default function Classroom() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSessionId = searchParams.get("session");
  const isNew = searchParams.get("new") === "1";
  const { sessions, createSession, getSession, captureSessionSummary, deleteSession } = useClassroomSessions();
  const { preferences } = useApp();
  const [deletingId, setDeletingId] = useState(null);

  const activeSession = activeSessionId ? getSession(activeSessionId) : null;

  useEffect(() => {
    if (!isNew) return;
    try {
      const raw = sessionStorage.getItem("laureat.pendingExercise");
      if (!raw) return;
      const exercise = JSON.parse(raw);
      sessionStorage.removeItem("laureat.pendingExercise");
      const title = exercise.enonce
        ? exercise.enonce.substring(0, 60) + (exercise.enonce.length > 60 ? "..." : "")
        : "Exercice scanné";
      const session = createSession({
        subject: exercise.subject || "Physique",
        title,
        exercise: {
          enonce: exercise.enonce,
          donnees: exercise.donnees,
          sections: exercise.sections,
        },
        personaId: preferences?.personality || "joseph",
      });
      setSearchParams({ session: session.id });
    } catch (err) {
      console.error("Failed to load pending exercise:", err);
    }
  }, [isNew]); // eslint-disable-line

  const startNewSession = () => {
    const s = createSession({
      subject: "Général",
      title: "Nouvelle conversation",
      personaId: preferences?.personality || "joseph",
    });
    setSearchParams({ session: s.id });
  };

  const openSession = (id) => setSearchParams({ session: id });

  const exitSession = () => {
    if (activeSession && captureSessionSummary) captureSessionSummary(activeSession);
    setSearchParams({});
  };

  const handleDelete = (id) => {
    deleteSession(id);
    setDeletingId(null);
  };

  if (activeSession) {
    return <ClassroomSession session={activeSession} onExit={exitSession} />;
  }

  return (
    <div className="pb-28">
      <div className="px-4 py-6">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap size={24} className="text-violet-600 dark:text-violet-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Salle de classe</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {preferences?.name ? `Bonjou ${preferences.name}, p` : "P"}ose tes questions au prof
        </p>
      </div>

      {sessions.length > 0 && sessions[0].messages?.length > 0 && (
        <section className="px-4 mb-4">
          <motion.button initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} whileTap={{ scale: 0.98 }} onClick={() => openSession(sessions[0].id)}
            className="w-full p-4 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-lg shadow-violet-500/30 flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Sparkles size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold">Reprendre</div>
              <div className="font-bold text-sm truncate">{sessions[0].title}</div>
              <div className="text-[11px] text-white/80 mt-0.5">{sessions[0].subject} · {formatRelativeTime(sessions[0].lastViewedAt)}</div>
            </div>
            <ChevronRight size={20} />
          </motion.button>
        </section>
      )}

      <section className="px-4 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-3">Actions rapides</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction icon={MessageCircle} label="Conversation" sublabel="Pose une question" color="from-violet-500 to-indigo-600" onClick={startNewSession} />
          <QuickAction icon={PencilRuler} label="Tableau blanc" sublabel="Schéma, diagramme" color="from-amber-500 to-orange-600" onClick={startNewSession} badge="Premium" />
        </div>
      </section>

      <section className="px-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-3">Sessions récentes</h2>
        {sessions.length === 0 ? (
          <EmptyState onStart={startNewSession} />
        ) : (
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <SessionCard
                key={s.id}
                session={s}
                delay={i * 0.04}
                onClick={() => openSession(s.id)}
                onDelete={() => setDeletingId(s.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deletingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeletingId(null)}
            className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Supprimer cette session ?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                La conversation et le tableau seront supprimés. Cette action est définitive.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDelete(deletingId)}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickAction({ icon: Icon, label, sublabel, color, onClick, badge }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick} className="relative rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm text-left">
      {badge && (
        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
          {badge}
        </span>
      )}
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-md`}>
        <Icon size={20} className="text-white" strokeWidth={2} />
      </div>
      <div className="font-bold text-sm text-slate-900 dark:text-white">{label}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sublabel}</div>
    </motion.button>
  );
}

function SessionCard({ session, delay, onClick, onDelete }) {
  const lastMessage = session.messages?.[session.messages.length - 1];
  const preview = lastMessage?.content || "Conversation vide";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative flex items-center gap-2 p-3.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm"
    >
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 flex-shrink-0">
          <MessageCircle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{session.title}</div>
            <span className="text-[10px] text-slate-400 flex-shrink-0">{formatRelativeTime(session.lastViewedAt)}</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{preview}</div>
        </div>
      </button>
      <button
        onClick={onDelete}
        className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
        title="Supprimer"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

function EmptyState({ onStart }) {
  return (
    <div className="text-center py-12">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center mb-4 shadow-xl shadow-violet-500/30">
        <HelpCircle size={36} className="text-white" />
      </motion.div>
      <h3 className="font-bold text-slate-900 dark:text-white mb-1">Ta salle de classe est vide</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto">
        Scanne un exercice ou démarre une conversation avec le prof.
      </p>
      <motion.button whileTap={{ scale: 0.97 }} onClick={onStart}
        className="px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/30 inline-flex items-center gap-2">
        <Plus size={18} />Commencer
      </motion.button>
    </div>
  );
}

function formatRelativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days}j`;
  const weeks = Math.floor(days / 7);
  return `il y a ${weeks}sem`;
}
