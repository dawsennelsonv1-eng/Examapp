// src/components/classroom/VoiceInputButton.jsx
// v16 ROOT FIX: Browser records as webm/opus which Gemini REJECTS.
// We now decode in-browser via AudioContext → re-encode as WAV → send to API.
// Gemini accepts wav natively, so transcription will actually work.

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

  /**
   * Convert ANY recorded audio blob to a 16kHz mono WAV blob using AudioContext.
   * Gemini accepts WAV directly. This is the missing piece — webm/opus is rejected.
   */
  const blobToWav = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    // Downmix to mono + resample to 16kHz (Gemini-friendly, smaller payload)
    const targetSampleRate = 16000;
    const offlineCtx = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * targetSampleRate),
      targetSampleRate
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start();
    const rendered = await offlineCtx.startRendering();
    audioCtx.close();

    // Encode as 16-bit PCM WAV
    const samples = rendered.getChannelData(0);
    const pcm = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    const wavBuffer = pcmToWav(pcm, targetSampleRate);
    return new Blob([wavBuffer], { type: "audio/wav" });
  };

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || state === "processing") return;

    if (state === "recording") {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) { notify("Mikwofòn pa disponib."); return; }
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
        if (chunksRef.current.length === 0) { setState("idle"); notify("Anyen pa anrejistre."); return; }

        setState("processing");
        const rawBlob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        if (rawBlob.size < 1000) { setState("idle"); notify("Anrejistreman twò kout."); return; }

        try {
          // CRITICAL: convert to WAV before sending. Gemini rejects webm/opus.
          const wavBlob = await blobToWav(rawBlob);

          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const response = await fetch("/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audioData: reader.result, // data:audio/wav;base64,...
                  language: "fr",
                  mimeType: "audio/wav",
                }),
              });
              const data = await response.json();
              if (!response.ok) { setState("idle"); notify(data?.error || "Erè transcription."); return; }
              const text = data?.data?.text?.trim();
              if (text) {
                onTranscribed(text);
              } else {
                notify("Pa t kapab tande sa w di a.");
              }
            } catch {
              notify("Erè koneksyon.");
            } finally {
              setState("idle");
            }
          };
          reader.readAsDataURL(wavBlob);
        } catch (err) {
          console.error("WAV conversion failed:", err);
          setState("idle");
          notify("Erè konvèsyon odyo.");
        }
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

// WAV header writer (PCM 16-bit mono, sampleRate Hz)
function pcmToWav(pcmInt16, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmInt16.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let o = 0;
  const writeString = (s) => { for (let i = 0; i < s.length; i++) view.setUint8(o++, s.charCodeAt(i)); };

  writeString("RIFF");
  view.setUint32(o, 36 + dataSize, true); o += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(o, 16, true); o += 4;
  view.setUint16(o, 1, true); o += 2;
  view.setUint16(o, numChannels, true); o += 2;
  view.setUint32(o, sampleRate, true); o += 4;
  view.setUint32(o, byteRate, true); o += 4;
  view.setUint16(o, blockAlign, true); o += 2;
  view.setUint16(o, bitsPerSample, true); o += 2;
  writeString("data");
  view.setUint32(o, dataSize, true); o += 4;
  for (let i = 0; i < pcmInt16.length; i++) {
    view.setInt16(o, pcmInt16[i], true);
    o += 2;
  }
  return buffer;
}
