// src/components/classroom/MessageBubble.jsx
// Differentiated message types: thinking, acknowledge, explain, question, praise.
// Each has its own icon and visual styling.

import { motion } from "framer-motion";
import { Volume2, VolumeX, Pause, Play, User } from "lucide-react";
import TutorAvatar from "../shared/TutorAvatar";
import { MESSAGE_TYPES } from "../../utils/constants";

export default function MessageBubble({
  message,
  isUser,
  isSpeaking,
  isPaused,
  onPlay,
  onPause,
  onStop,
  personaId,
}) {
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 justify-end"
      >
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          <div className="rounded-2xl rounded-br-sm bg-violet-600 text-white px-4 py-2.5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content || message.text}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-slate-600 dark:text-slate-300" />
        </div>
      </motion.div>
    );
  }

  // Tutor message — could have segments
  const segments = message.segments || [{ type: "explain", text: message.content || message.text, speakable: message.speakable }];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2 justify-start"
    >
      <TutorAvatar personaId={personaId} size="sm" speaking={isSpeaking} />
      <div className="max-w-[80%] flex flex-col gap-1.5">
        {segments.map((seg, idx) => (
          <SegmentBubble key={idx} segment={seg} />
        ))}

        <div className="flex items-center gap-2 px-2">
          {isSpeaking && !isPaused ? (
            <button
              onClick={onPause}
              className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 font-semibold"
            >
              <Pause size={11} fill="currentColor" /> Pause
            </button>
          ) : isPaused ? (
            <button
              onClick={onPlay}
              className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 font-semibold"
            >
              <Play size={11} fill="currentColor" /> Reprendre
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-violet-600"
            >
              <Volume2 size={11} /> Écouter
            </button>
          )}
          {(isSpeaking || isPaused) && (
            <button
              onClick={onStop}
              className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-red-500"
            >
              <VolumeX size={11} /> Stop
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const FALLBACK_TYPE_INFO = { label: "Explication", icon: "💬" };

function SegmentBubble({ segment }) {
  const seg = segment || {};
  const typeInfo =
    (MESSAGE_TYPES && (MESSAGE_TYPES[seg.type] || MESSAGE_TYPES.explain)) ||
    FALLBACK_TYPE_INFO;

  const bubbleStyles = {
    thinking: "bg-slate-100 dark:bg-slate-800/70 italic text-slate-700 dark:text-slate-300 border-l-2 border-slate-400",
    acknowledge: "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm",
    explain: "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm",
    question: "bg-amber-50 dark:bg-amber-950/30 text-slate-900 dark:text-slate-100 border-2 border-amber-300/40",
    praise: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-semibold",
  };

  return (
    <div className={`relative rounded-2xl rounded-bl-sm px-4 py-2.5 ${bubbleStyles[seg.type] || bubbleStyles.explain}`}>
      <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xs shadow-md">
        <span title={typeInfo.label}>{typeInfo.icon}</span>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap pl-2">{seg.text}</p>
    </div>
  );
}
