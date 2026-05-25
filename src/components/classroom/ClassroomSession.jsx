// src/components/classroom/ClassroomSession.jsx
// Interactive teaching: virtual board grows step-by-step as tutor speaks.
// Tutor explains → asks "Eske w konprann?" → user clicks Oui/Non → next step.
// Failed attempts cascade: different words → analogy → kreyòl → diagram → ask specifically.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Maximize2, Minimize2, Loader2,
  Sparkles, User, Volume2, VolumeX, ThumbsUp, ThumbsDown,
  PencilRuler,
} from "lucide-react";
import { useClassroomSessions } from "../../hooks/useClassroom";
import { useApp } from "../../contexts/AppContext";
import { speakText, stopSpeaking } from "../../services/ttsService";
import VirtualBoard from "./VirtualBoard";

export default function ClassroomSession({ session, onExit }) {
  const { appendMessage, updateSession } = useClassroomSessions();
  const { preferences, planTier } = useApp();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [boardExpanded, setBoardExpanded] = useState(true);
  const [localMessages, setLocalMessages] = useState(session.messages || []);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [currentBoardState, setCurrentBoardState] = useState(session.boardState || {
    donnees: [],
    activeSteps: [],
    diagramSvg: null,
  });
  const [currentStep, setCurrentStep] = useState(session.currentStep || "intro");
  const [failCount, setFailCount] = useState(session.failCount || 0);
  const [currentSectionNumber, setCurrentSectionNumber] = useState(0);
  const messagesEndRef = useRef(null);
  const hasInitiated = useRef(false);

  const isPremium = planTier === "premium";

  // Initial greeting + start teaching if exercise loaded
  useEffect(() => {
    if (hasInitiated.current) return;
    hasInitiated.current = true;

    if (localMessages.length === 0) {
      if (session.exercise) {
        // Tutor introduces the exercise
        startExerciseTeaching();
      } else {
        // Open-ended greeting
        const greeting = {
          id: `msg_${Date.now()}`,
          role: "tutor",
          content: `Bonjou ${preferences?.name || ""} ! Ki sa ou vle nou travay ansanm jodi a ?`,
          timestamp: Date.now(),
        };
        appendMessage(session.id, greeting);
        setLocalMessages([greeting]);
        speakMessage(greeting);
      }
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages.length]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const startExerciseTeaching = async () => {
    const exercise = session.exercise;
    const introMsg = {
      id: `msg_${Date.now()}`,
      role: "tutor",
      content: `Bon ${preferences?.name || ""}, gade. Nou pral travay sou egzèsis sa a ansanm, etap pa etap.

Premye bagay: idantifye Données yo. M ap kòmanse mete yo sou tableau a.`,
      timestamp: Date.now(),
    };
    setLocalMessages([introMsg]);
    appendMessage(session.id, introMsg);
    setCurrentStep("donnees");
    speakMessage(introMsg);

    // Reveal données one by one (sync with voice timing)
    await new Promise((r) => setTimeout(r, 1500));
    for (const d of exercise.donnees || []) {
      setCurrentBoardState((prev) => ({
        ...prev,
        donnees: [...prev.donnees, d],
      }));
      await new Promise((r) => setTimeout(r, 600));
    }

    // After all données revealed, ask comprehension
    await new Promise((r) => setTimeout(r, 800));
    const checkMsg = {
      id: `msg_${Date.now()}_check`,
      role: "tutor",
      content: "Bon, donnée yo sou tableau a. Eske w konprann sa nou genyen ?",
      timestamp: Date.now(),
      needsConfirmation: true,
    };
    setLocalMessages((prev) => [...prev, checkMsg]);
    appendMessage(session.id, checkMsg);
    speakMessage(checkMsg);
  };

  const speakMessage = async (msg) => {
    if (!msg.content) return;
    setSpeakingMessageId(msg.id);
    try {
      const speakable = msg.speakable || stripFormulasForSpeech(msg.content);
      await speakText(speakable, "fr-FR", isPremium);
    } catch (err) {
      console.warn("Speech failed:", err);
    } finally {
      setSpeakingMessageId(null);
    }
  };

  const handleSend = async (overrideText = null) => {
    const text = (overrideText || input).trim();
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
          context: {
            exercise: session.exercise,
            currentStep,
            boardState: currentBoardState,
          },
          messages: newMessages.map((m) => ({
            role: m.role === "tutor" ? "assistant" : "user",
            content: m.content,
          })),
          userMessage: text,
          preferences: preferences || { language: "mix", personality: "patient" },
          teachingMode: session.exercise ? "step-by-step" : "general",
          currentStep,
          failCount,
        }),
      });

      if (!response.ok) throw new Error("API unavailable");

      const data = await response.json();
      const tutorMsg = {
        id: `msg_${Date.now() + 1}`,
        role: "tutor",
        content: data?.data?.reply || "M ap reflechi sou sa...",
        speakable: data?.data?.speakable,
        timestamp: Date.now(),
        needsConfirmation: data?.data?.needsConfirmation,
      };
      setLocalMessages((prev) => [...prev, tutorMsg]);
      appendMessage(session.id, tutorMsg);

      // Apply board update
      const boardUpdate = data?.data?.boardUpdate;
      if (boardUpdate && boardUpdate.action === "add") {
        if (boardUpdate.target === "donnees" && boardUpdate.content) {
          setCurrentBoardState((prev) => ({
            ...prev,
            donnees: [
              ...prev.donnees,
              typeof boardUpdate.content === "string"
                ? { symbol: "?", value: boardUpdate.content, unit: "" }
                : boardUpdate.content,
            ],
          }));
        } else if (boardUpdate.target === "solution" && boardUpdate.content) {
          setCurrentBoardState((prev) => ({
            ...prev,
            activeSteps: [
              ...prev.activeSteps,
              typeof boardUpdate.content === "string"
                ? { type: "deduction", content: boardUpdate.content }
                : boardUpdate.content,
            ],
          }));
        }
      }

      // Request diagram if AI suggested
      if (data?.data?.shouldDrawDiagram && data?.data?.diagramDescription) {
        requestDiagram(data.data.diagramDescription);
      }

      // Speak the response
      speakMessage(tutorMsg);

      // Persist board state
      updateSession(session.id, {
        boardState: currentBoardState,
        currentStep,
        failCount,
      });
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = {
        id: `msg_${Date.now() + 1}`,
        role: "tutor",
        content: "Pa gen koneksyon entènèt la. Eseye ankò.",
        timestamp: Date.now(),
      };
      setLocalMessages((prev) => [...prev, errorMsg]);
      appendMessage(session.id, errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async (understood) => {
    if (understood) {
      setFailCount(0);
      // Move to next step
      await advanceToNextStep();
    } else {
      setFailCount((prev) => prev + 1);
      // Ask the AI to re-explain differently
      const newFailCount = failCount + 1;
      let prompt;
      if (newFailCount === 1) {
        prompt = "M pa konprann. Eksplike m yon lòt jan tanpri.";
      } else if (newFailCount === 2) {
        prompt = "M toujou pa konprann. Bay yon egzanp konkrè.";
      } else if (newFailCount === 3) {
        prompt = "Map gen difikilte. Eksplike m sa an kreyòl ak yon schema tanpri.";
      } else {
        prompt = "Pou m kapab ede w konprann pi byen, di m egzakteman ki sa w pa konprann.";
      }
      handleSend(prompt);
    }
  };

  const advanceToNextStep = async () => {
    const exercise = session.exercise;
    if (!exercise) return;

    if (currentStep === "donnees") {
      // Move to first section
      setCurrentStep("section_1");
      setCurrentSectionNumber(1);
      handleSend(`Bon, m konprann données yo. Kòmanse pwemyè etap la tanpri.`);
    } else if (currentStep.startsWith("section_")) {
      const sectionIdx = parseInt(currentStep.split("_")[1]);
      const nextIdx = sectionIdx + 1;
      if (nextIdx <= (exercise.sections?.length || 0)) {
        setCurrentStep(`section_${nextIdx}`);
        setCurrentSectionNumber(nextIdx);
        setCurrentBoardState((prev) => ({ ...prev, activeSteps: [] }));
        handleSend(`Pase nan etap ${nextIdx} tanpri.`);
      } else {
        // Done!
        setCurrentStep("done");
        const doneMsg = {
          id: `msg_${Date.now()}`,
          role: "tutor",
          content: `Bravo ${preferences?.name || ""}! Nou fin solisyone egzèsis la ansanm. Eske ou genyen yon lòt kesyon ?`,
          timestamp: Date.now(),
        };
        setLocalMessages((prev) => [...prev, doneMsg]);
        appendMessage(session.id, doneMsg);
        speakMessage(doneMsg);
      }
    }
  };

  const requestDiagram = async (description) => {
    try {
      const response = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: session.title,
          description,
          subject: session.subject,
          style: "diagram",
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.data?.svg) {
          setCurrentBoardState((prev) => ({ ...prev, diagramSvg: data.data.svg }));
        }
      }
    } catch (err) {
      console.warn("Diagram request failed:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastMessage = localMessages[localMessages.length - 1];
  const showConfirmButtons = lastMessage?.role === "tutor" && lastMessage?.needsConfirmation;

  return (
    <div className="fixed inset-0 z-40 bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => {
            stopSpeaking();
            onExit();
          }}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
            {session.title}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {session.subject} {session.exercise ? "· Étape par étape" : ""}
          </div>
        </div>
        <button
          onClick={() => setBoardExpanded(!boardExpanded)}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400"
        >
          {boardExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </header>

      {/* Virtual board */}
      <motion.div
        animate={{
          height: boardExpanded ? "55%" : "30%",
        }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0 p-3"
      >
        <VirtualBoard
          boardState={currentBoardState}
          exercise={session.exercise}
          currentSectionNumber={currentSectionNumber}
        />
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
        {localMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSpeaking={speakingMessageId === msg.id}
            onSpeak={() => speakMessage(msg)}
            onStop={() => {
              stopSpeaking();
              setSpeakingMessageId(null);
            }}
          />
        ))}
        {sending && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Confirmation buttons (when teacher asks "Eske w konprann?") */}
      {showConfirmButtons && !sending && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-4 pb-2 flex gap-2 flex-shrink-0"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleConfirm(true)}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-md flex items-center justify-center gap-2"
          >
            <ThumbsUp size={18} />
            Oui, je comprends
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleConfirm(false)}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold shadow-md flex items-center justify-center gap-2"
          >
            <ThumbsDown size={18} />
            Non, explique encore
          </motion.button>
        </motion.div>
      )}

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
            onClick={() => handleSend()}
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

function MessageBubble({ message, isSpeaking, onSpeak, onStop }) {
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
            onClick={isSpeaking ? onStop : onSpeak}
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

function stripFormulasForSpeech(text) {
  // Remove LaTeX-like math markers, keep readable text
  return text
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
