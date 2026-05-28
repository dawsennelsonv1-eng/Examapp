// src/components/classroom/VoiceInputButton.jsx
// v12: Tap-to-toggle (NOT hold). First tap starts, second tap stops & sends.
// Uses createVoiceRecorder from ttsService for consistency.

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, Loader2 } from "lucide-react";
import { createVoiceRecorder } from "../../services/ttsService";

export default function VoiceInputButton({ onTranscribed, disabled }) {
  const [state, setState] = useState("idle"); // idle | recording | processing
  const recorderRef = useRef(null);

  useEffect(() => {
    return () => {
      try { recorderRef.current?.stop(); } catch {}
    };
  }, []);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || state === "processing") return;

    if (state === "recording") {
      recorderRef.current?.stop();
      setState("processing");
      return;
    }

    // Start
    const rec = createVoiceRecorder();
    recorderRef.current = rec;

    await rec.start({
      onComplete: ({ text }) => {
        setState("idle");
        if (text && text.trim()) {
          onTranscribed(text.trim());
        }
      },
      onError: (err) => {
        console.error("Voice error:", err);
        setState("idle");
        if (err?.name === "NotAllowedError") {
          alert("Aksè mikwofòn refize. Aktive li nan paramèt navigateur a.");
        }
      },
      maxDuration: 60000,
    });

    setState("recording");
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      disabled={disabled || state === "processing"}
      type="button"
      className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-colors ${
        state === "recording"
          ? "bg-red-500 text-white"
          : state === "processing"
          ? "bg-slate-300 dark:bg-slate-700 text-slate-500"
          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
      } disabled:opacity-50`}
      title={state === "recording" ? "Tape pou kanpe" : "Tape pou pale"}
    >
      {state === "processing" ? (
        <Loader2 size={18} className="animate-spin" />
      ) : state === "recording" ? (
        <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
          <Mic size={18} fill="currentColor" />
        </motion.div>
      ) : (
        <Mic size={18} />
      )}
    </motion.button>
  );
}
