// src/components/classroom/ClassroomSession.jsx — v23
// Hardened to prevent "Cannot read properties of undefined (reading 'label')"
// crash. Every potentially-undefined access is now optional-chained.

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Send, Maximize2, Minimize2, Loader2,
  Users, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { useClassroomSessions } from "../../hooks/useClassroom";
import { useApp } from "../../contexts/AppContext";
import { useOrientation } from "../../hooks/useOrientation";
import {
  speakText, stopSpeaking, pauseSpeaking, resumeSpeaking,
} from "../../services/ttsService";
import { PERSONALITIES } from "../../utils/constants";
import MultiBoard from "./MultiBoard";
import MessageBubble from "./MessageBubble";
import SuggestedQuestions from "./SuggestedQuestions";
import VoiceInputButton from "./VoiceInputButton";
import TutorSwitchModal from "./TutorSwitchModal";
import TutorAvatar from "../shared/TutorAvatar";
import CallTutorButton from "./CallTutorButton";

function defaultBoards() {
  return [
    { id: "board_enonce",   type: "enonce",   name: "Énoncé",   label: "Énoncé",   donnees: [], items: [] },
    { id: "board_solution", type: "solution", name: "Solution", label: "Solution", items: [] },
    { id: "board_visuel",   type: "visuel",   name: "Visuel",   label: "Visuel",   svg: null },
  ];
}

export default function ClassroomSession({ session, onExit }) {
  // GUARD: session must exist with an id
  if (!session || !session.id) {
    return (
      <div className="fixed inset-0 z-40 bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center text-slate-300">
          <p className="text-sm mb-3">Session introuvable.</p>
          <button onClick={onExit} className="text-violet-400 font-bold">Retour</button>
        </div>
      </div>
    );
  }

  const sessionsHook = useClassroomSessions() || {};
  const appendMessage = sessionsHook.appendMessage || (() => {});
  const updateSession = sessionsHook.updateSession || (() => {});

  const appCtx = useApp() || {};
  const preferences = appCtx.preferences || {};
  const planTier = appCtx.planTier || "free";

  const orientation = useOrientation() || { isLandscape: false };
  const isLandscape = orientation.isLandscape;

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [boardExpanded, setBoardExpanded] = useState(true);
  const [localMessages, setLocalMessages] = useState(session.messages || []);

  // GUARD: boards might be missing/empty
  const initialBoards = (Array.isArray(session.boards) && session.boards.length > 0)
    ? session.boards.map((b) => ({ ...b, label: b.label || b.name || "Board" }))
    : defaultBoards();

  const [boards, setBoards] = useState(initialBoards);
  const [activeBoardId, setActiveBoardId] = useState(session.activeBoardId || initialBoards[0]?.id || "board_enonce");
  const [tutorWritingOn, setTutorWritingOn] = useState(null);

  const [currentPersonaId, setCurrentPersonaId] = useState(
    session.currentPersonaId || preferences?.personality || "joseph"
  );
  const [showTutorSwitch, setShowTutorSwitch] = useState(false);

  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const [failCount, setFailCount] = useState(session.failCount || 0);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [lastModelUsed, setLastModelUsed] = useState(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const [autoSendTimer, setAutoSendTimer] = useState(null);

  const messagesEndRef = useRef(null);
  const hasInitiated = useRef(false);
  const isPremium = planTier === "premium";

  useEffect(() => {
    if (hasInitiated.current) return;
    hasInitiated.current = true;
    if (localMessages.length === 0) {
      if (session.exercise) startExerciseTeaching();
      else sendGreeting();
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages.length]);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    updateSession(session.id, { boards, activeBoardId, currentPersonaId, failCount });
  }, [boards, activeBoardId, currentPersonaId, failCount]); // eslint-disable-line

  const sendGreeting = () => {
    const persona = PERSONALITIES.find((p) => p.id === currentPersonaId) || PERSONALITIES[0];
    const name = preferences?.name || "";
    const greetingText = `Bonjour ${name} ! Je suis ${persona?.name || "ton prof"}. Sur quoi veux-tu travailler aujourd'hui ?`;
    const greeting = {
      id: `msg_${Date.now()}`,
      role: "tutor",
      personaId: currentPersonaId,
      segments: [{ type: "acknowledge", text: greetingText, speakable: greetingText }],
      content: greetingText,
      timestamp: Date.now(),
    };
    setLocalMessages([greeting]);
    appendMessage(session.id, greeting);
    speakMessage(greeting);
  };

  const startExerciseTeaching = async () => {
    const exercise = session.exercise || {};
    const name = preferences?.name || "";

    const newBoards = defaultBoards();
    setBoards(newBoards);
    setActiveBoardId("board_enonce");
    setTutorWritingOn("board_enonce");

    const introText = `Bien ${name}, regardons cet exercice ensemble. Je vais d'abord placer les Données sur le tableau.`;
    const intro = {
      id: `msg_${Date.now()}`,
      role: "tutor",
      personaId: currentPersonaId,
      segments: [{ type: "acknowledge", text: introText, speakable: introText }],
      content: introText,
      timestamp: Date.now(),
    };
    setLocalMessages([intro]);
    appendMessage(session.id, intro);
    speakMessage(intro);

    await new Promise((r) => setTimeout(r, 1500));
    const donnees = Array.isArray(exercise.donnees) ? exercise.donnees : [];
    for (const d of donnees) {
      setBoards((prev) =>
        prev.map((b) =>
          b.id === "board_enonce" ? { ...b, donnees: [...(b.donnees || []), d] } : b
        )
      );
      await new Promise((r) => setTimeout(r, 700));
    }

    await new Promise((r) => setTimeout(r, 800));
    const checkText = "Tu comprends toutes les données ?";
    const checkMsg = {
      id: `msg_${Date.now()}_check`,
      role: "tutor",
      personaId: currentPersonaId,
      segments: [{ type: "question", text: checkText, speakable: checkText }],
      content: checkText,
      timestamp: Date.now(),
      needsConfirmation: true,
    };
    setLocalMessages((prev) => [...prev, checkMsg]);
    appendMessage(session.id, checkMsg);
    setPendingConfirmation(true);
    speakMessage(checkMsg);
    setTutorWritingOn(null);
  };

  const speakMessage = async (msg) => {
    if (!msg?.segments && !msg?.content) return;
    setSpeakingMessageId(msg.id);
    setIsPaused(false);
    try {
      const text = msg.segments
        ? msg.segments.map((s) => s?.speakable || s?.text || "").join(" ")
        : msg.content;
      const result = await speakText(text, "fr-FR", {
        persona: msg.personaId || currentPersonaId,
      });
      if (result?.promise) await result.promise;
    } catch (err) {
      console.warn("Speech failed:", err);
    } finally {
      setSpeakingMessageId(null);
      setIsPaused(false);
    }
  };

  const handlePauseResume = () => {
    if (isPaused) { resumeSpeaking(); setIsPaused(false); }
    else { pauseSpeaking(); setIsPaused(true); }
  };

  const handleStopSpeak = () => {
    stopSpeaking();
    setSpeakingMessageId(null);
    setIsPaused(false);
  };

  const handleSend = async (overrideText = null) => {
    if (autoSendTimer) { clearTimeout(autoSendTimer); setAutoSendTimer(null); }
    const text = (overrideText || input).trim();
    if (!text || sending) return;

    const userMsg = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      text,
      timestamp: Date.now(),
    };
    const newMessages = [...localMessages, userMsg];
    setLocalMessages(newMessages);
    appendMessage(session.id, userMsg);
    setInput("");
    setSending(true);
    setPendingConfirmation(false);
    setSuggestedQuestions([]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          context: {
            exercise: session.exercise,
            boards: boards.map((b) => ({ id: b.id, type: b.type, name: b.name || b.label })),
            activeBoard: activeBoardId,
          },
          messages: newMessages.map((m) => ({
            role: m.role === "tutor" ? "assistant" : "user",
            content: m.content || m.text,
          })),
          userMessage: text,
          preferences: { ...preferences, personality: currentPersonaId },
          teachingMode: session.exercise ? "step-by-step" : "general",
          failCount,
          activeBoard: activeBoardId?.replace("board_", ""),
        }),
      });

      if (!response.ok) throw new Error("API unavailable");
      const data = await response.json();
      const segments = data?.data?.segments || [];
      const combinedText = segments.map((s) => s?.text || "").join("\n\n");

      const tutorMsg = {
        id: `msg_${Date.now() + 1}`,
        role: "tutor",
        personaId: currentPersonaId,
        segments,
        content: combinedText,
        timestamp: Date.now(),
        needsConfirmation: data?.data?.needsConfirmation,
      };
      setLocalMessages((prev) => [...prev, tutorMsg]);
      appendMessage(session.id, tutorMsg);
      setLastModelUsed(data?.data?.modelUsed);

      if (Array.isArray(data?.data?.suggestedQuestions)) {
        setSuggestedQuestions(data.data.suggestedQuestions);
      }
      if (data?.data?.needsConfirmation) setPendingConfirmation(true);
      if (data?.data?.tutorSwitchSuggestion || failCount >= 3) setShowTutorSwitch(true);

      speakMessage(tutorMsg);
    } catch (err) {
      console.error("Chat error:", err);
      const errText = "Pas de connexion. Réessaie.";
      const errorMsg = {
        id: `msg_${Date.now() + 1}`,
        role: "tutor",
        personaId: currentPersonaId,
        segments: [{ type: "acknowledge", text: errText, speakable: errText }],
        content: errText,
        timestamp: Date.now(),
      };
      setLocalMessages((prev) => [...prev, errorMsg]);
      appendMessage(session.id, errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = (understood) => {
    setPendingConfirmation(false);
    if (understood) {
      setFailCount(0);
      handleSend("Oui, je comprends. Continuons.");
    } else {
      const newFail = failCount + 1;
      setFailCount(newFail);
      const prompts = [
        "Je ne comprends pas. Explique-moi autrement s'il te plaît.",
        "Je ne comprends toujours pas. Donne-moi un exemple concret.",
        "J'ai du mal. Explique-moi avec un schéma.",
        "Aide-moi à comprendre, qu'est-ce que je rate exactement ?",
      ];
      handleSend(prompts[Math.min(newFail - 1, prompts.length - 1)]);
    }
  };

  const requestDiagram = async (description) => {
    if (!description) return;
    setTutorWritingOn("board_visuel");
    setActiveBoardId("board_visuel");
    try {
      const response = await fetch("/api/content?task=board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: String(description).substring(0, 80),
          description,
          subject: session.subject,
          style: "diagram",
          exerciseContext: session.exercise,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.data?.svg) {
          setBoards((prev) =>
            prev.map((b) => (b.id === "board_visuel" ? { ...b, svg: data.data.svg } : b))
          );
        }
      }
    } catch (err) {
      console.warn("Diagram request failed:", err);
    } finally {
      setTutorWritingOn(null);
    }
  };

  const handleTutorSwitch = (newPersonaId) => {
    const newPersona = PERSONALITIES.find((p) => p.id === newPersonaId) || PERSONALITIES[0];
    setCurrentPersonaId(newPersonaId);
    setFailCount(0);
    setShowTutorSwitch(false);
    const switchText = `Bonjour, je suis ${newPersona?.name || "ton nouveau prof"}. Laisse-moi t'expliquer à ma façon.`;
    const switchMsg = {
      id: `msg_${Date.now()}`,
      role: "tutor",
      personaId: newPersonaId,
      segments: [{ type: "acknowledge", text: switchText, speakable: switchText }],
      content: switchText,
      timestamp: Date.now(),
    };
    setLocalMessages((prev) => [...prev, switchMsg]);
    appendMessage(session.id, switchMsg);
    speakMessage(switchMsg);
  };

  const handleVoiceTranscribed = (text) => {
    setInput(text);
    if (autoSendTimer) clearTimeout(autoSendTimer);
    const timer = setTimeout(() => handleSend(text), 7000);
    setAutoSendTimer(timer);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (autoSendTimer) { clearTimeout(autoSendTimer); setAutoSendTimer(null); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentPersona = PERSONALITIES.find((p) => p.id === currentPersonaId) || PERSONALITIES[0];
  const sessionTitle = session.title || "Nouvelle conversation";

  return (
    <div className="fixed inset-0 z-40 bg-slate-100 dark:bg-slate-950 flex flex-col">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
        <button onClick={() => { stopSpeaking(); onExit(); }}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <ArrowLeft size={18} />
        </button>
        <TutorAvatar personaId={currentPersonaId} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
            {currentPersona?.name || "Prof"} · {sessionTitle}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {session.subject || "Général"}
          </div>
        </div>

        <CallTutorButton personaId={currentPersonaId} exerciseContext={session.exercise}
          language={preferences?.language || "fr"} studentName={preferences?.name || ""} isPremium={isPremium} compact />

        <button onClick={() => setShowTutorSwitch(true)}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
          <Users size={16} />
        </button>
        <button onClick={() => setBoardExpanded(!boardExpanded)}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
          {boardExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </header>

      <motion.div animate={{ height: boardExpanded ? "50%" : "25%" }} transition={{ duration: 0.3 }} className="flex-shrink-0 px-2 pt-2">
        <MultiBoard
          boards={boards}
          activeBoardId={activeBoardId}
          onChangeBoard={setActiveBoardId}
          tutorWritingOn={tutorWritingOn}
          exercise={session.exercise}
          onRequestDiagram={requestDiagram}
        />
      </motion.div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-1 space-y-3">
        {localMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isUser={msg.role === "user"}
            isSpeaking={speakingMessageId === msg.id && !isPaused}
            isPaused={speakingMessageId === msg.id && isPaused}
            onPlay={() => speakMessage(msg)}
            onPause={handlePauseResume}
            onStop={handleStopSpeak}
            personaId={msg.personaId || currentPersonaId}
          />
        ))}
        {sending && (
          <div className="flex gap-2 items-center text-slate-500 dark:text-slate-400 text-xs pl-2">
            <TutorAvatar personaId={currentPersonaId} size="xs" speaking />
            <span>écrit...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {pendingConfirmation && !sending && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-3 pb-2 flex gap-2 flex-shrink-0">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleConfirm(true)}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2">
            <ThumbsUp size={16} />Oui, je comprends
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleConfirm(false)}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2">
            <ThumbsDown size={16} />Non, explique encore
          </motion.button>
        </motion.div>
      )}

      {!sending && suggestedQuestions.length > 0 && !pendingConfirmation && (
        <SuggestedQuestions
          questions={suggestedQuestions}
          onPick={(q) => { setSuggestedQuestions([]); handleSend(q); }}
          onDismiss={() => setSuggestedQuestions([])}
        />
      )}

      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 flex-shrink-0">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Pose ta question..."
              disabled={sending}
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <VoiceInputButton onTranscribed={handleVoiceTranscribed} onError={(m) => alert(m)} disabled={sending} />
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleSend()} disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-white flex items-center justify-center shadow-md disabled:opacity-50">
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </motion.button>
        </div>
      </div>

      <TutorSwitchModal isOpen={showTutorSwitch} currentPersonaId={currentPersonaId}
        onClose={() => setShowTutorSwitch(false)} onSwitch={handleTutorSwitch} />
    </div>
  );
}
