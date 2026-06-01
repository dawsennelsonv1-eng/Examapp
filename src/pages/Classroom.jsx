// src/pages/Classroom.jsx — v22-fix
// 1. Defensive: wraps ClassroomSession in error boundary so it never white-screens
// 2. Brings back v18 visual style (cleaner cards, less saturated colors)
// 3. Quick actions don't navigate to broken states — both create a real session first

import { useEffect, useState, Component } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, PencilRuler, Sparkles, Plus, ChevronRight,
  GraduationCap, HelpCircle, Trash2, AlertCircle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useClassroomSessions } from "../hooks/useClassroom";
import { useApp } from "../contexts/AppContext";
import ClassroomSession from "../components/classroom/ClassroomSession";

// Error boundary so a broken session can't white-screen the whole page
class SessionBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("ClassroomSession crashed:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-40 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center mb-3">
              <AlertCircle size={28} className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Oups, problème dans cette session</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {this.state.error?.message || "Erè enkoni"}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); this.props.onReset?.(); }}
              className="px-4 py-2 rounded-xl bg-violet-600 text-white font-semibold text-sm"
            >
              Retour aux sessions
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Classroom() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSessionId = searchParams.get("session");
  const isNew = searchParams.get("new") === "1";
  const sessionsHook = useClassroomSessions();
  const {
    sessions = [],
    createSession,
    getSession,
    captureSessionSummary,
    deleteSession,
  } = sessionsHook || {};
  const { preferences } = useApp() || {};
  const [deletingId, setDeletingId] = useState(null);

  const activeSession = activeSessionId && getSession ? getSession(activeSessionId) : null;

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
      if (!createSession) return;
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

  const startNewSession = (variant = "chat") => {
    if (!createSession) return;
    const s = createSession({
      subject: "Général",
      title: variant === "board" ? "Tableau blanc" : "Nouvelle conversation",
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
    if (deleteSession) deleteSession(id);
    setDeletingId(null);
  };

  if (activeSession) {
    return (
      <SessionBoundary onReset={exitSession}>
        <ClassroomSession session={activeSession} onExit={exitSession} />
      </SessionBoundary>
    );
  }

  return (
    <div className="pb-28 pt-2">
      <header className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap size={22} className="text-violet-600 dark:text-violet-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Salle de classe</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {preferences?.name ? `Bonjou ${preferences.name}, p` : "P"}ose tes questions au prof
        </p>
      </header>

      {sessions.length > 0 && sessions[0].messages?.length > 0 && (
        <section className="px-4 mt-4 mb-4">
          <motion.button
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openSession(sessions[0].id)}
            className="w-full p-4 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md flex items-center gap-3 text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold">Reprendre</div>
              <div className="font-bold text-sm truncate">{sessions[0].title}</div>
              <div className="text-[11px] text-white/80 mt-0.5">{sessions[0].subject} · {formatRelativeTime(sessions[0].lastViewedAt)}</div>
            </div>
            <ChevronRight size={18} />
          </motion.button>
        </section>
      )}

      <section className="px-4 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-2.5">Actions rapides</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={MessageCircle}
            label="Conversation"
            sublabel="Pose une question"
            color="violet"
            onClick={() => startNewSession("chat")}
          />
          <QuickAction
            icon={PencilRuler}
            label="Tableau blanc"
            sublabel="Schéma, diagramme"
            color="amber"
            badge="Premium"
            onClick={() => startNewSession("board")}
          />
        </div>
      </section>

      <section className="px-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-2.5">Sessions récentes</h2>
        {sessions.length === 0 ? (
          <EmptyState onStart={() => startNewSession("chat")} />
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

      <AnimatePresence>
        {deletingId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeletingId(null)}
            className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Supprimer cette session ?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                La conversation et le tableau seront supprimés.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeletingId(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold">
                  Annuler
                </button>
                <button onClick={() => handleDelete(deletingId)}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold">
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
  const colorMap = {
    violet: "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400",
    amber:  "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-500",
  };
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}
      className="relative rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm text-left ring-1 ring-slate-100 dark:ring-slate-700">
      {badge && (
        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
          {badge}
        </span>
      )}
      <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center mb-3`}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="font-bold text-sm text-slate-900 dark:text-white">{label}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sublabel}</div>
    </motion.button>
  );
}

function SessionCard({ session, delay, onClick, onDelete }) {
  const lastMessage = session.messages?.[session.messages.length - 1];
  const preview = (lastMessage?.content || lastMessage?.text || "Conversation vide").toString().substring(0, 80);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative flex items-center gap-2 p-3.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700"
    >
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400 flex-shrink-0">
          <MessageCircle size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{session.title}</div>
            <span className="text-[10px] text-slate-400 flex-shrink-0">{formatRelativeTime(session.lastViewedAt)}</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{preview}</div>
        </div>
      </button>
      <button onClick={onDelete}
        className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </motion.div>
  );
}

function EmptyState({ onStart }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center mb-3">
        <HelpCircle size={28} className="text-violet-600 dark:text-violet-400" />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white mb-1">Ta salle de classe est vide</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-xs mx-auto">
        Scanne un exercice ou démarre une conversation.
      </p>
      <motion.button whileTap={{ scale: 0.97 }} onClick={onStart}
        className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm inline-flex items-center gap-2">
        <Plus size={16} />Commencer
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
  return `il y a ${Math.floor(days / 7)}sem`;
}
