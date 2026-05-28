// src/components/classroom/VoiceInputButton.jsx
// v14: Transcription fills the text box (via onTranscribed). Parent starts a 7s
// auto-send timer that cancels if the user touches the input. Shows errors.

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, Loader2 } from "lucide-react";

export default function VoiceInputButton({ onTranscribed, onError, disabled }) {
  const [state, setState] = useState("idle"); // idle | recording | processing
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeRef = useRef("");
  const timeoutRef = useRef(null);

  useEffect(() => () => cleanup(), []);

  const cleanup = () => {
    try { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); } catch {}
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const notify = (msg) => { onError ? onError(msg) : console.warn(msg); };

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || state === "processing") return;

    if (state === "recording") {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) { notify("Mikwofòn pa disponib sou aparèy sa."); return; }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const opts = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      let mimeType = "";
      for (const m of opts) { if (MediaRecorder.isTypeSupported(m)) { mimeType = m; break; } }
      mimeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
        if (chunksRef.current.length === 0) { setState("idle"); notify("Anyen pa anrejistre. Eseye ankò."); return; }

        setState("processing");
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        if (blob.size < 1000) { setState("idle"); notify("Anrejistreman twò kout. Pale pi lontan."); return; }

        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const response = await fetch("/api/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audioData: reader.result, language: "fr", mimeType: mimeType || "audio/webm" }),
            });
            const data = await response.json();
            if (!response.ok) { setState("idle"); notify(data?.error || "Pa kapab transcri. Eseye ankò."); return; }
            const text = data?.data?.text?.trim();
            if (text) {
              onTranscribed(text); // fills the text box; parent handles 7s auto-send
            } else {
              notify("Pa t kapab tande sa w di a. Pale pi fò oswa tape mesaj la.");
            }
          } catch {
            notify("Erè koneksyon. Eseye ankò.");
          } finally {
            setState("idle");
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.onerror = () => { cleanup(); setState("idle"); notify("Erè mikwofòn."); };

      recorder.start();
      setState("recording");
      timeoutRef.current = setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 60000);
    } catch (err) {
      cleanup();
      setState("idle");
      notify(err.name === "NotAllowedError"
        ? "Aksè mikwofòn refize. Aktive li nan paramèt navigateur a."
        : "Pa kapab itilize mikwofòn la.");
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      disabled={disabled || state === "processing"}
      type="button"
      className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-colors ${
        state === "recording" ? "bg-red-500 text-white"
        : state === "processing" ? "bg-slate-300 dark:bg-slate-700 text-slate-500"
        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
      } disabled:opacity-50`}
      title={state === "recording" ? "Tape pou kanpe" : "Tape pou pale"}
    >
      {state === "processing" ? <Loader2 size={18} className="animate-spin" />
        : state === "recording" ? (
          <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
            <Mic size={18} fill="currentColor" />
          </motion.div>
        ) : <Mic size={18} />}
    </motion.button>
  );
}
