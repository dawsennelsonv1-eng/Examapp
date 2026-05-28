// src/components/classroom/VoiceInputButton.jsx
// v11: FIXED — tap-to-toggle mode (not hold). Reliable on mobile.
// First tap = start recording. Second tap = stop & transcribe.

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";

export default function VoiceInputButton({ onTranscribed, disabled }) {
  const [state, setState] = useState("idle"); // idle | recording | processing
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timeoutRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAndCleanup();
    // eslint-disable-next-line
  }, []);

  const stopAndCleanup = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      try {
        recorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || state === "processing") return;

    if (state === "recording") {
      // Stop recording
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
      return;
    }

    // Start recording
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Mikwofòn pa disponib sou aparèy sa.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Find supported MIME type
      const mimeOptions = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      let mimeType = "";
      for (const m of mimeOptions) {
        if (MediaRecorder.isTypeSupported(m)) {
          mimeType = m;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        if (chunksRef.current.length === 0) {
          setState("idle");
          return;
        }

        setState("processing");

        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const response = await fetch("/api/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audioData: reader.result, language: "fr" }),
            });

            if (!response.ok) {
              console.error("Transcribe failed:", response.status);
              setState("idle");
              return;
            }

            const data = await response.json();
            const text = data?.data?.text?.trim();
            if (text) {
              onTranscribed(text);
            }
          } catch (err) {
            console.error("Transcribe error:", err);
          } finally {
            setState("idle");
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.onerror = (err) => {
        console.error("Recorder error:", err);
        stopAndCleanup();
        setState("idle");
      };

      recorder.start();
      setState("recording");

      // Auto-stop after 60s
      timeoutRef.current = setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 60000);
    } catch (err) {
      console.error("getUserMedia failed:", err);
      if (err.name === "NotAllowedError") {
        alert("Aksè mikwofòn refize. Aktive li nan paramèt navigateur a.");
      } else {
        alert("Pa kapab itilize mikwofòn la. " + (err.message || ""));
      }
      stopAndCleanup();
      setState("idle");
    }
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
      title={state === "recording" ? "Tap pou kanpe" : "Tap pou pale"}
    >
      {state === "processing" ? (
        <Loader2 size={18} className="animate-spin" />
      ) : state === "recording" ? (
        <motion.div
          animate={{ scale: [1, 1.25, 1] }}
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
