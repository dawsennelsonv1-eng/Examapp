// src/components/classroom/ClassroomSession.jsx
// Full classroom: chat + virtual board + voice playback

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Maximize2, Minimize2, PencilRuler,
  Loader2, Sparkles, User, Volume2, VolumeX,
} from "lucide-react";
import { useClassroomSessions } from "../../hooks/useClassroom";
import { speakText, stopSpeaking } from "../../services/ttsService";

export default function ClassroomSession({ session, onExit }) {
  const { appendMessage, updateSession } = useClassroomSessions();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [generatingBoard, setGeneratingBoard] = useState(false);
  const [boardExpanded, setBoardExpanded] = useState(false);
  const [localMessages, setLocalMessages] = useState(session.messages || []);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  // Seed greeting
  useEffect(() => {
    if (localMessages.length === 0) {
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
            content:
              "Bonjou ! M se pwofesè ou a. Ki pwoblèm ou vle nou travay ansanm jodi a ?",
            timestamp: Date.now(),
          };
      appendMessage(session.id, greeting);
      setLocalMessages([greeting]);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages.length]);

  useEffect(() => {
    // Stop any speech when leaving
    return () => stopSpeaking();
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    const newMessages = [...localMessages, userMsg];
    setLocalMessages(newMessages);
    appendMessage(session.id, userMsg);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          context: session.context,
          messages: newMessages.map((m) => ({
            role: m.role === "tutor" ? "assistant" : "user",
            content: m.content,
          })),
          userMessage: text,
        }),
      });

      if (!response.ok) throw new Error("API unavailable");

      const data = await response.json();
      const reply = data?.data?.reply;
      const boardSvg = data?.data?.boardSvg;

      const tutorMsg = {
        id: `msg_${Date.now() + 1}`,
        role: "tutor",
        content: reply || "M ap reflechi...",
        timestamp: Date.now(),
      };
      setLocalMessages((prev) => [...prev, tutorMsg]);
      appendMessage(session.id, tutorMsg);

      if (boardSvg) {
        updateSession(session.id, { boardSvg });
        setBoardExpanded(true);
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = {
        id: `msg_${Date.now() + 1}`,
        role: "tutor",
        content: "Pa gen koneksyon entènèt. Eseye ankò.",
        timestamp: Date.now(),
      };
      setLocalMessages((prev) => [...prev, errorMsg]);
      appendMessage(session.id, errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleRequestBoard = async () => {
    setGeneratingBoard(true);
    try {
      const recentContext = localMessages
        .slice(-4)
        .map((m) => m.content)
        .join("\n");
      const response = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: session.title,
          description: recentContext,
          subject: session.subject,
        }),
      });

      if (!response.ok) throw new Error("Board API failed");
      const data = await response.json();
      if (data?.data?.svg) {
        updateSession(session.id, { boardSvg: data.data.svg });
        setBoardExpanded(true);
        const msg = {
          id: `msg_${Date.now()}`,
          role: "tutor",
          content: "M fin trase yon schéma sou tableau a. Gade l pou w wè pi klè.",
          timestamp: Date.now(),
        };
        setLocalMessages((prev) => [...prev, msg]);
        appendMessage(session.id, msg);
      }
    } catch (err) {
      console.error("Board error:", err);
    } finally {
      setGeneratingBoard(false);
    }
  };

  const handleSpeak = async (msg) => {
    if (speakingMessageId === msg.id) {
      stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }
    setSpeakingMessageId(msg.id);
    try {
      await speakText(msg.content, "fr-FR");
    } finally {
      setSpeakingMessageId(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasBoard = Boolean(session.boardSvg);

  return (
    <div className="fixed inset-0 z-40 bg-slate-50 dark:bg-slate-950 flex flex-col">
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
            {session.subject}
          </div>
        </div>
        <button
          onClick={handleRequestBoard}
          disabled={generatingBoard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold shadow-md disabled:opacity-50"
        >
          {generatingBoard ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <PencilRuler size={14} />
          )}
          Tableau
        </button>
      </header>

      <AnimatePresence>
        {(hasBoard || session.context) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: boardExpanded ? "55%" : "30%",
              opacity: 1,
            }}
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

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {localMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSpeaking={speakingMessageId === msg.id}
            onSpeak={() => handleSpeak(msg)}
          />
        ))}
        {sending && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

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
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isSpeaking, onSpeak }) {
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
      <div className={`max-w-[75%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? "bg-violet-600 text-white rounded-br-sm"
              : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm shadow-sm"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        {!isUser && (
          <button
            onClick={onSpeak}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
            {isSpeaking ? "Arrêter" : "Écouter"}
          </button>
        )}
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 justify-start">
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
