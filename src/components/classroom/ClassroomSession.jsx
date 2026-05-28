// src/components/classroom/ClassroomSession.jsx
// v11: Adds CallTutorButton in header (Premium feature for real-time voice call).
// Otherwise identical to v7-wave2 ClassroomSession.

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Send, Maximize2, Minimize2, Loader2,
  Users, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { useClassroomSessions } from "../../hooks/useClassroom";
import { useApp } from "../../contexts/AppContext";
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
    { id: "board_enonce",   type: "enonce",   name: "Énoncé",   donnees: [], items: [] },
    { id: "board_solution", type: "solution", name: "Solution", items: [] },
    { id: "board_visuel",   type: "visuel",   name: "Visuel",   svg: null },
  ];
}

export default function ClassroomSession({ session, onExit }) {
  const { appendMessage, updateSession } = useClassroomSessions();
  const { preferences, planTier } = useApp();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [boardExpanded, setBoardExpanded] = useState(true);
  const [localMessages, setLocalMessages] = useState(session.messages || []);

  const [boards, setBoards] = useState(session.boards || defaultBoards());
  const [activeBoardId, setActiveBoardId] = useState(session.activeBoardId || boards[0]?.id);
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

  const messagesEndRef = useRef(null);
  const hasInitiated = useRef(false);
  const isPremium = planTier === "premium";

  useEffect(() => {
    if (hasInitiated.current) return;
    hasInitiated.current = true;
    if (localMessages.length === 0) {
      if (session.exercise) {
        startExerciseTeaching();
      } else {
        sendGreeting();
      }
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages.length]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    updateSession(session.id, { boards, activeBoardId, currentPersonaId, failCount });
  }, [boards, activeBoardId, currentPersonaId, failCount]); // eslint-disable-line

  const sendGreeting = () => {
    const persona = PERSONALITIES.find((p) => p.id === currentPersonaId);
    const name = preferences?.name || "";
    const greeting = {
      id: `msg_${Date.now()}`,
      role: "tutor",
      personaId: currentPersonaId,
      segments: [{
        type: "acknowledge",
        text: `Bonjou ${name} ! M se ${persona?.name}. Ki sa w vle nou travay ansanm jodi a ?`,
        speakable: `Bonjou ${name}. M se ${persona?.name}. Ki sa w vle nou travay ansanm jodi a ?`,
      }],
      content: `Bonjou ${name} ! M se ${persona?.name}. Ki sa w vle nou travay ansanm jodi a ?`,
      timestamp: Date.now(),
    };
    setLocalMessages([greeting]);
    appendMessage(session.id, greeting);
    speakMessage(greeting);
  };

  const startExerciseTeaching = async () => {
    const exercise = session.exercise;
    const name = preferences?.name || "";

    const newBoards = [
      { id: "board_enonce",   type: "enonce",   name: "Énoncé",   donnees: [], items: [] },
      { id: "board_solution", type: "solution", name: "Solution", items: [] },
      { id: "board_visuel",   type: "visuel",   name: "Visuel",   svg: null },
    ];
    setBoards(newBoards);
    setActiveBoardId("board_enonce");
    setTutorWritingOn("board_enonce");

    const intro = {
      id: `msg_${Date.now()}`,
      role: "tutor",
      personaId: currentPersonaId,
      segments: [
        {
          type: "acknowledge",
          text: `Bon ${name}, gade. Nou pral travay sou egzèsis sa a ansanm.`,
          speakable: `Bon ${name}, gade. Nou pral travay sou egzèsis sa a ansanm.`,
        },
        {
          type: "explain",
          text: `Premye etap: m ap mete Données yo sou tablo a.`,
          speakable: `Premye etap. M ap mete Données yo sou tablo a.`,
        },
      ],
      content: `Bon ${name}, gade. M ap mete Données yo sou tablo a.`,
      timestamp: Date.now(),
    };
    setLocalMessages([intro]);
    appendMessage(session.id, intro);
    speakMessage(intro);

    await new Promise((r) => setTimeout(r, 1500));
    for (const d of exercise.donnees || []) {
      setBoards((prev) =>
        prev.map((b) =>
          b.id === "board_enonce" ? { ...b, donnees: [...b.donnees, d] } : b
        )
      );
      await new Promise((r) => setTimeout(r, 700));
    }

    await new Promise((r) => setTimeout(r, 800));
    const checkMsg = {
      id: `msg_${Date.now()}_check`,
      role: "tutor",
      personaId: currentPersonaId,
      segments: [{
        type: "question",
        text: "Eske w konprann tout Données yo ?",
        speakable: "Eske w konprann tout Données yo ?",
      }],
      content: "Eske w konprann tout Données yo ?",
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
    if (!msg.segments && !msg.content) return;
    setSpeakingMessageId(msg.id);
    setIsPaused(false);
    try {
      const text = msg.segments
        ? msg.segments.map((s) => s.speakable || s.text).join(" ")
        : msg.content;
      const result = await speakText(text, "fr-FR", {
        isPremium,
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

  const handlePauseResume = (msgId) => {
    if (isPaused) {
      resumeSpeaking();
      setIsPaused(false);
    } else {
      pauseSpeaking();
      setIsPaused(true);
    }
  };

  const handleStopSpeak = () => {
    stopSpeaking();
    setSpeakingMessageId(null);
    setIsPaused(false);
  };

  const applyBoardActions = async (boardActions) => {
    if (!Array.isArray(boardActions) || !boardActions.length) return;
    for (const action of boardActions) {
      const boardId = `board_${action.board}`;
      setTutorWritingOn(boardId);
      setActiveBoardId(boardId);

      if (action.action === "add" && action.item) {
        setBoards((prev) =>
          prev.map((b) => {
            if (b.id !== boardId) return b;
            if (action.item.type === "donnee" || b.type === "enonce") {
              return { ...b, donnees: [...(b.donnees || []), action.item] };
            }
            return { ...b, items: [...(b.items || []), action.item] };
          })
        );
      } else if (action.action === "clear") {
        setBoards((prev) =>
          prev.map((b) => (b.id === boardId ? { ...b, items: [], donnees: [] } : b))
        );
      }
      await new Promise((r) => setTimeout(r, 600));
    }
    setTutorWritingOn(null);
  };

  const handleSend = async (overrideText = null) => {
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
            boards: boards.map((b) => ({ id: b.id, type: b.type, name: b.name })),
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
      const combinedText = segments.map((s) => s.text).join("\n\n");

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

      for (const seg of segments) {
        if (Array.isArray(seg.boardActions) && seg.boardActions.length) {
          await applyBoardActions(seg.boardActions);
        }
      }

      if (Array.isArray(data?.data?.suggestedQuestions) && data.data.suggestedQuestions.length) {
        setSuggestedQuestions(data.data.suggestedQuestions);
      }

      if (data?.data?.needsConfirmation) {
        setPendingConfirmation(true);
      }

      if (data?.data?.tutorSwitchSuggestion || failCount >= 3) {
        setShowTutorSwitch(true);
      }

      if (data?.data?.shouldDrawDiagram && data?.data?.diagramDescription) {
        requestDiagram(data.data.diagramDescription);
      }

      speakMessage(tutorMsg);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = {
        id: `msg_${Date.now() + 1}`,
        role: "tutor",
        personaId: currentPersonaId,
        segments: [{
          type: "acknowledge",
          text: "Pa gen koneksyon entènèt la. Eseye ankò.",
          speakable: "Pa gen koneksyon entènèt la. Eseye ankò.",
        }],
        content: "Pa gen koneksyon entènèt la. Eseye ankò.",
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
      handleSend("Wi m konprann. Ann kontinye.");
    } else {
      const newFail = failCount + 1;
      setFailCount(newFail);
      let prompt;
      if (newFail === 1)      prompt = "M pa konprann. Eksplike m yon lòt jan tanpri.";
      else if (newFail === 2) prompt = "M toujou pa konprann. Bay yon egzanp konkrè.";
      else if (newFail === 3) prompt = "M ap gen difikilte. Eksplike m an kreyòl ak yon schema.";
      else                    prompt = "Pou m kapab ede w konprann pi byen, ki sa egzakteman ou pa konprann ?";
      handleSend(prompt);
    }
  };

  const requestDiagram = async (description) => {
    setTutorWritingOn("board_visuel");
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
          setBoards((prev) =>
            prev.map((b) => (b.id === "board_visuel" ? { ...b, svg: data.data.svg } : b))
          );
          setActiveBoardId("board_visuel");
        }
      }
    } catch (err) {
      console.warn("Diagram request failed:", err);
    } finally {
      setTutorWritingOn(null);
    }
  };

  const handleTutorSwitch = (newPersonaId) => {
    const oldPersona = PERSONALITIES.find((p) => p.id === currentPersonaId);
    const newPersona = PERSONALITIES.find((p) => p.id === newPersonaId);
    setCurrentPersonaId(newPersonaId);
    setFailCount(0);
    setShowTutorSwitch(false);

    const switchMsg = {
      id: `msg_${Date.now()}`,
      role: "tutor",
      personaId: newPersonaId,
      segments: [{
        type: "acknowledge",
        text: `Bonjou, m se ${newPersona?.name}. M wè ${oldPersona?.name} t ap eksplike w yon bagay men li pa klè ase. Kite m eseye nan jan pa m...`,
        speakable: `Bonjou, m se ${newPersona?.name}. Kite m eseye eksplike w sa nan jan pa m.`,
      }],
      content: `Bonjou, m se ${newPersona?.name}.`,
      timestamp: Date.now(),
    };
    setLocalMessages((prev) => [...prev, switchMsg]);
    appendMessage(session.id, switchMsg);
    speakMessage(switchMsg);
  };

  const onBoardChange = (newBoardId) => {
    setActiveBoardId(newBoardId);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentPersona = PERSONALITIES.find((p) => p.id === currentPersonaId);

  return (
    <div className="fixed inset-0 z-40 bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => {
            stopSpeaking();
            onExit();
          }}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300"
        >
          <ArrowLeft size={18} />
        </button>
        <TutorAvatar personaId={currentPersonaId} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
            {currentPersona?.name} · {session.title}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {session.subject || "Général"}
            {lastModelUsed && <span className="ml-2">· {lastModelUsed.split("/").pop()}</span>}
          </div>
        </div>

        {/* NEW: Call tutor button (Premium feature, also visible for free as upsell) */}
        <CallTutorButton
          personaId={currentPersonaId}
          exerciseContext={session.exercise}
          language={preferences?.language || "mix"}
          studentName={preferences?.name || ""}
          isPremium={isPremium}
          compact
        />

        <button
          onClick={() => setShowTutorSwitch(true)}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400"
          title="Changer de prof"
        >
          <Users size={16} />
        </button>
        <button
          onClick={() => setBoardExpanded(!boardExpanded)}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400"
        >
          {boardExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </header>

      {/* Multi-board */}
      <motion.div
        animate={{ height: boardExpanded ? "50%" : "25%" }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0 px-2 pt-2"
      >
        <MultiBoard
          boards={boards}
          activeBoardId={activeBoardId}
          onChangeBoard={onBoardChange}
          tutorWritingOn={tutorWritingOn}
          exercise={session.exercise}
        />
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-1 space-y-3">
        {localMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isUser={msg.role === "user"}
            isSpeaking={speakingMessageId === msg.id && !isPaused}
            isPaused={speakingMessageId === msg.id && isPaused}
            onPlay={() => speakMessage(msg)}
            onPause={() => handlePauseResume(msg.id)}
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

      {/* Confirmation buttons */}
      {pendingConfirmation && !sending && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-3 pb-2 flex gap-2 flex-shrink-0"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleConfirm(true)}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
          >
            <ThumbsUp size={16} />
            Wi, m konprann
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleConfirm(false)}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
          >
            <ThumbsDown size={16} />
            Non, eksplike ankò
          </motion.button>
        </motion.div>
      )}

      {/* Suggested questions */}
      {!sending && suggestedQuestions.length > 0 && !pendingConfirmation && (
        <SuggestedQuestions
          questions={suggestedQuestions}
          onPick={(q) => {
            setSuggestedQuestions([]);
            handleSend(q);
          }}
          onDismiss={() => setSuggestedQuestions([])}
        />
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
          <VoiceInputButton
            onTranscribed={(text) => handleSend(text)}
            disabled={sending}
          />
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

      <TutorSwitchModal
        isOpen={showTutorSwitch}
        currentPersonaId={currentPersonaId}
        onClose={() => setShowTutorSwitch(false)}
        onSwitch={handleTutorSwitch}
      />
    </div>
  );
}
