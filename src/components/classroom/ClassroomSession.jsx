// src/components/classroom/ClassroomSession.jsx
// Full-screen session: virtual board on top, chat at the bottom.
// Mock AI responses for now — Tier 3 wires up real Gemini/Claude webhooks.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Maximize2, Minimize2, PencilRuler,
  Loader2, Sparkles, User, Volume2,
} from "lucide-react";
import { useClassroomSessions } from "../../hooks/useClassroom";

export default function ClassroomSession({ session, onExit }) {
  const { appendMessage, updateSession } = useClassroomSessions();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [boardExpanded, setBoardExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  // If session has context (came from Scan & Solve "Explain this step"),
  // seed it with the tutor's opening question
  useEffect(() => {
    if (session.messages.length === 0 && session.context) {
      const greeting = {
        id: `msg_${Date.now()}`,
        role: "tutor",
        content: `M wè w ap travay sou pwoblèm sa a. Kisa w pa konprann egzakteman nan etap la: "${session.context.fromStep}" ?`,
        timestamp: Date.now(),
      };
      appendMessage(session.id, greeting);
    } else if (session.messages.length === 0) {
      const greeting = {
        id: `msg_${Date.now()}`,
        role: "tutor",
        content: "Bonjou ! M se pwofesè ou a. Ki pwoblèm ou vle nou travay ansanm jodi a ?",
        timestamp: Date.now(),
      };
      appendMessage(session.id, greeting);
    }
  }, []); // eslint-disable-line

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    appendMessage(session.id, userMsg);
    setInput("");
    setSending(true);

    // Mock delay + response. Replace with real webhook call in Tier 3.
    await new Promise((r) => setTimeout(r, 1400));

    const tutorMsg = {
      id: `msg_${Date.now() + 1}`,
      role: "tutor",
      content: mockTutorReply(text),
      timestamp: Date.now(),
    };
    appendMessage(session.id, tutorMsg);

    // Mock: sometimes add a board diagram
    if (text.toLowerCase().includes("schéma") || text.toLowerCase().includes("dessine")) {
      updateSession(session.id, { boardSvg: generateMockBoard() });
    }

    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
            {session.subject}
          </div>
        </div>
      </header>

      {/* Virtual board */}
      <AnimatePresence>
        {(session.boardSvg || session.context) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: boardExpanded ? "60%" : "30%",
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
            <div className="w-full h-full flex items-center justify-center p-4 pt-8 overflow-auto">
              {session.boardSvg ? (
                <div dangerouslySetInnerHTML={{ __html: session.boardSvg }} />
              ) : session.context ? (
                <div className="text-center max-w-md">
                  <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                    Contexte
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 italic leading-relaxed">
                    "{session.context.fromStep}"
                  </p>
                </div>
              ) : null}
            </div>
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
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
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
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 rounded-full bg-slate-400"
        />
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          className="w-2 h-2 rounded-full bg-slate-400"
        />
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          className="w-2 h-2 rounded-full bg-slate-400"
        />
      </div>
    </motion.div>
  );
}

/* ─── Mock reply logic — replace with real webhook in Tier 3 ─── */

function mockTutorReply(userText) {
  const text = userText.toLowerCase();
  if (text.includes("pourquoi") || text.includes("poukisa")) {
    return "Bon kesyon ! On sait que dans ce type de problème, on applique la conservation de l'énergie. Alors, si l'énergie potentielle au départ égale l'énergie cinétique à l'arrivée, on a m·g·h = ½·m·v². Ou konprann la ?";
  }
  if (text.includes("exemple") || text.includes("egzanp")) {
    return "Pran yon egzanp konkrè : imagine yon bokit ki tonbe nan yon pwi. Plis li tonbe, plis li pran vitès. C'est exactement ce que dit la formule — plus h (la hauteur) est grand, plus v (la vitesse) est grande.";
  }
  if (text.includes("schéma") || text.includes("dessine")) {
    return "M ap trase yon schéma sou tableau a pou w kapab wè l pi klè. Gade anlè.";
  }
  return "D'accord, m ap esplike w sa. Nan fizik ayisyen, pwofesè yo toujou mande nou kòmanse par la Donnée. Ensuite, on identifie la Formule, puis on passe à la Résolution. Kisa w panse de sa ?";
}

function generateMockBoard() {
  // Simple SVG force diagram as mock — Tier 3 will generate real ones via Claude Opus
  return `
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-md">
      <rect x="0" y="0" width="300" height="200" fill="transparent"/>
      <line x1="50" y1="150" x2="250" y2="150" stroke="currentColor" stroke-width="2" class="text-slate-400"/>
      <rect x="120" y="110" width="60" height="40" fill="#8b5cf6" rx="4"/>
      <text x="150" y="135" text-anchor="middle" fill="white" font-size="14" font-weight="bold">m</text>
      <line x1="150" y1="110" x2="150" y2="60" stroke="#ef4444" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="160" y="85" fill="#ef4444" font-size="12" font-weight="bold">P = m·g</text>
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444"/>
        </marker>
      </defs>
    </svg>
  `;
}
