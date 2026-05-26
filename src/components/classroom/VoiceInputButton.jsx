// src/components/classroom/VoiceInputButton.jsx
// Hold to record, release to transcribe via Whisper.

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { createVoiceRecorder } from "../../services/ttsService";

export default function VoiceInputButton({ onTranscribed, disabled }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const recorderRef = useRef(null);

  const startRecording = async () => {
    if (disabled || recording || processing) return;
    setRecording(true);
    const recorder = createVoiceRecorder();
    recorderRef.current = recorder;
    await recorder.start({
      onComplete: ({ text }) => {
        setRecording(false);
        setProcessing(false);
        if (text) onTranscribed(text);
      },
      onError: (err) => {
        console.error("Voice input error:", err);
        setRecording(false);
        setProcessing(false);
      },
      maxDuration: 30000,
    });
  };

  const stopRecording = () => {
    if (recorderRef.current && recording) {
      setRecording(false);
      setProcessing(true);
      recorderRef.current.stop();
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onPointerDown={startRecording}
      onPointerUp={stopRecording}
      onPointerLeave={stopRecording}
      disabled={disabled || processing}
      className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-colors ${
        recording
          ? "bg-red-500 text-white"
          : processing
          ? "bg-slate-300 dark:bg-slate-700 text-slate-500"
          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
      } disabled:opacity-50`}
    >
      {processing ? (
        <Loader2 size={18} className="animate-spin" />
      ) : recording ? (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <Mic size={18} fill="currentColor" />
        </motion.div>
      ) : (
        <Mic size={18} />
      )}
    </motion.button>
  );
}
