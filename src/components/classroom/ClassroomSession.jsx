// src/components/classroom/ClassroomSession.jsx
// Real webhook integration: tutor messages → webhook → reply + optional SVG.
// "Draw on board" button explicitly requests an SVG from the AI.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Maximize2, Minimize2, PencilRuler,
  Loader2, Sparkles, User, AlertCircle, Lock,
} from "lucide-react";
import { useClassroomSessions } from "../../hooks/useClassroom";
import { useUsage } from "../../hooks/useUsage";
import { sendTutorMessage, generateBoard, WebhookError } from "../../services/webhookClient";

export default function ClassroomSession({ session, onExit }) {
  const { appendMessage, updateSession } = useClassroomSessions();
  const { planTier, canUse, increment, getRemaining } = useUsage();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [generatingBoard, setGeneratingBoard] = useState(false);
  const [boardExpanded, setBoardExpanded] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Seed first tutor greeting if session is empty
  useEffect(() => {
    if (session.messages.length > 0) return;

    const greeting = session.context
      ? {
          id: `msg_${Date.now()}`,
          role: "tutor",
          content: `M wè w ap travay sou pwoblèm sa a. Kisa w pa konprann egzakteman nan etap la: "${session.context.fromStep}" ?`,
          timestamp: Date.now(),
        }
      : {
          id: `msg_${Date.now()}`,
          role: "tutor",
          content: "Bonjou ! M se pwofesè ou a. Ki pwoblèm ou vle nou travay ansanm jodi a ?",
          timestamp: Date.now(),
        };
    appendMessage(session.id, greeting);
  }, []); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    if (!canUse("chats")) {
      setError(`Limite quotidienne atteinte (${planTier}). Upgrade pour continuer.`);
      return;
    }

    setError(null);
    const userMsg = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    appendMessage(session.id, userMsg);
    setInput("");
    setSending(true);
    increment("chats");

    try {
      const response = await sendTutorMessage({
        sessionId: session.id,
        messages: [...session.messages, userMsg].map((m) => ({
          role: m.role === "tutor" ? "assistant" : "user",
          content: m.content,
        })),
        userMessage: text,
        context: session.context,
        planTier,
      });

      const tutorMsg = {
        id: `msg_${Date.now() + 1}`,
        role: "tutor",
        content: response.reply || "M ap reflechi sou sa... Eseye rephrase kesyon w la.",
        timestamp: Date.now(),
      };
      appendMessage(session.id, tutorMsg);

      // AI decided to draw a diagram with its reply
      if (response.boardSvg) {
        updateSession(session.id, { boardSvg: response.boardSvg });
        setBoardExpanded(true);
      }
    } catch (err) {
      setError(err instanceof WebhookError ? err.message : "Erreur de connexion");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleRequestBoard = async () => {
    if (!canUse("boards")) {
      setError(`Limite de tableaux atteinte (${getRemaining("boards")} restant${getRemaining("boards") > 1 ? "s" : ""}). Upgrade pour plus.`);
      return;
    }

    setGeneratingBoard(true);
    setError(null);
    increment("boards");

    try {
      // Use last few messages as context for what to draw
      const recentContext = session.messages
        .slice(-4)
        .map((m) => m.content)
        .join("\n");

      const result = await generateBoard({
        topic: session.title,
        description: recentContext,
        subject: session.subject,
        planTier,
      });

      if (result.svg) {
        updateSession(session.id, { boardSvg: result.svg });
        setBoardExpanded(true);
        // Add a tutor message announcing the board
        const msg = {
          id: `msg_${Date.now()}`,
          role: "tutor",
          content: "M fin trase yon schéma sou tableau a. Gade l pou w kapab wè pi klè.",
          timestamp: Date.now(),
        };
        appendMessage(session.id, msg);
      }
    } catch (err) {
      setError("Pa kapab jenere schéma a. Eseye ankò.");
      console.error(err);
    } finally {
      setGeneratingBoard(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasBoard = Boolean(session.boardSvg);
  const boardsRemaining = getRemaining("boards");
  const chatsRemaining = getRemaining("chats");

  return (
    <div className="fixed inset-0 z-40 bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onExit}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
            {session.title}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {session.subject} · {chatsRemaining === Infinity ? "∞" : chatsRemaining} messages
          </div>
        </div>
        <button
          onClick={handleRequestBoard}
          disabled={generatingBoard || !canUse("boards")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold shadow-md disabled:opacity-50"
        >
          {generatingBoard ? <Loader2 size={14} className="animate-spin" /> : <PencilRuler size={14} />}
          {canUse("boards") ? "Tableau" : <Lock size={14} />}
        </button>
      </header>

      {/* Virtual board */}
      <AnimatePresence>
        {(hasBoard || session.context) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: boardExpanded ? "55%" : "30%", opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative flex-shrink-0"
          >
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <button
                onClick={() => setBoardExpanded(!boardExpanded)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400"
              >
                {boardExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
              <PencilRuler size={12} />
              Tableau
            </div>
            <div className="w-full h-full flex items-center justify-center p-4 pt-8 overflow-auto text-slate-700 dark:text-slate-200">
              {hasBoard ? (
                <div
                  className="max-w-full"
                  dangerouslySetInnerHTML={{ __html: session.boardSvg }}
                />
              ) : session.context ? (
                <div className="text-center max-w-md">
                  <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                    Contexte
                  </div>
                  <p className="text-sm italic leading-relaxed">
                    "{session.context.fromStep}"
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-500/30 px-4 py-2.5 flex items-center gap-2 text-sm text-red-700 dark:text-red-400"
          >
            <AlertCircle size={16} className="flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-xs font-semibold">
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {session.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {sending && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 flex-shrink-0">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pose ta question..."
              disabled={sending}
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-white flex items-center justify-center shadow-md disabled:opacity-50 disabled:grayscale"
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Sparkles size={14} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-violet-600 text-white rounded-br-sm"
            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm shadow-sm"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-slate-600 dark:text-slate-300" />
        </div>
      )}
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-2 justify-start"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center flex-shrink-0">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1">
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay }}
            className="w-2 h-2 rounded-full bg-slate-400"
          />
        ))}
      </div>
    </motion.div>
  );
}
