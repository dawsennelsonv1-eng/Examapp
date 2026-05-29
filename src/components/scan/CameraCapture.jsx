// src/components/scan/CameraCapture.jsx
// v17: TRUE FULLSCREEN. Uses position:fixed + 100vw/100vh, no padding. Camera fills
// every pixel. Capture uses the video's natural resolution (no scaling glitch).
// Adds: clear "type instead" button with label, larger scan frame, mode captions.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, ZapOff, Image as ImageIcon, Type,
  RotateCw, Sparkles, CheckCircle2,
} from "lucide-react";

const MODES = [
  {
    id: "solve",
    label: "Résoudre",
    caption: "Scanner un exercice à résoudre",
    icon: Sparkles,
    color: "from-violet-500 to-indigo-600",
  },
  {
    id: "verify",
    label: "Vérifier",
    caption: "Tu as déjà résolu — le prof vérifie ton travail",
    icon: CheckCircle2,
    color: "from-emerald-500 to-teal-600",
  },
];

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [scanMode, setScanMode] = useState("solve");
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startCamera = async () => {
    try {
      // Request highest available resolution for crisp scans
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Check for flash capability
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() || {};
      setFlashSupported(Boolean(caps.torch));
    } catch (err) {
      console.error("Camera error:", err);
      setError(err.name === "NotAllowedError"
        ? "Aksè kamera refize. Aktive li nan paramèt yo."
        : "Pa kapab louvri kamera. Eseye nan yon lòt aparèy.");
    }
  };

  const toggleFlash = async () => {
    if (!flashSupported || !streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn(!flashOn);
    } catch (err) {
      console.warn("Flash toggle failed:", err);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);
    try {
      const video = videoRef.current;
      // Capture at the video's NATURAL dimensions — no scaling, no quality loss
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onCapture(dataUrl, null, scanMode);
    } catch (err) {
      console.error("Capture failed:", err);
      setError("Pa kapab pran foto a.");
    } finally {
      setCapturing(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onCapture(ev.target.result, null, scanMode);
    reader.readAsDataURL(file);
  };

  const handleTextSubmit = () => {
    if (textInput.trim().length < 5) return;
    onCapture(null, textInput.trim(), scanMode);
  };

  // ---------- TEXT INPUT MODE ----------
  if (textMode) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        <header className="flex items-center justify-between p-4 text-white">
          <button onClick={() => setTextMode(false)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <X size={20} />
          </button>
          <div className="text-sm font-bold">Tape ton exercice</div>
          <div className="w-10" />
        </header>

        <div className="flex-1 p-4">
          <textarea
            autoFocus
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Tape l'énoncé de ton exercice ici..."
            className="w-full h-full bg-slate-900 text-white p-4 rounded-2xl text-base resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="p-4 pb-8">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleTextSubmit}
            disabled={textInput.trim().length < 5}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-700 text-white font-bold text-base shadow-lg disabled:opacity-40 disabled:grayscale"
          >
            Résoudre cet exercice
          </motion.button>
        </div>
      </div>
    );
  }

  // ---------- CAMERA MODE (TRUE FULLSCREEN) ----------
  return (
    <div
      className="fixed inset-0 z-50 bg-black overflow-hidden"
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Camera video — covers the ENTIRE viewport, no padding, no margins */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "cover" }}
      />

      {/* Dark gradient at top and bottom for control readability */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-72 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-4 pt-safe">
        <button onClick={onClose} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
          <X size={20} />
        </button>

        <div className="flex items-center gap-2">
          {flashSupported && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={toggleFlash}
              className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center text-white shadow-lg ${flashOn ? "bg-amber-500/80" : "bg-black/40"}`}>
              {flashOn ? <Zap size={20} fill="currentColor" /> : <ZapOff size={20} />}
            </motion.button>
          )}
        </div>
      </div>

      {/* Centered scan frame — BIGGER than before */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
          style={{ width: "85vw", height: "55vh", maxWidth: 500, maxHeight: 600 }}
        >
          {/* Four corner brackets */}
          {[
            { top: -2, left: -2, borderTop: 4, borderLeft: 4 },
            { top: -2, right: -2, borderTop: 4, borderRight: 4 },
            { bottom: -2, left: -2, borderBottom: 4, borderLeft: 4 },
            { bottom: -2, right: -2, borderBottom: 4, borderRight: 4 },
          ].map((style, i) => (
            <div key={i} className="absolute w-10 h-10 border-white/90" style={{ ...style, borderStyle: "solid" }} />
          ))}

          {/* Animated scan line */}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: "100%" }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent shadow-lg shadow-violet-500/50"
          />

          {/* Instruction text in the middle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white/70 text-xs font-medium px-4 text-center max-w-[80%] backdrop-blur-sm bg-black/20 rounded-lg py-2">
              Cadre ton exercice dans le rectangle
            </p>
          </div>
        </motion.div>
      </div>

      {/* Mode selector */}
      <div className="absolute bottom-44 inset-x-0 z-10 px-4">
        <div className="flex gap-2 justify-center">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = scanMode === m.id;
            return (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => setScanMode(m.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full backdrop-blur-md shadow-lg font-bold text-xs transition-all ${
                  active
                    ? `bg-gradient-to-r ${m.color} text-white ring-2 ring-white/30`
                    : "bg-black/40 text-white/70"
                }`}
              >
                <Icon size={14} />
                {m.label}
              </motion.button>
            );
          })}
        </div>

        {/* Caption explaining the active mode */}
        <AnimatePresence mode="wait">
          <motion.p
            key={scanMode}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-center text-[11px] text-white/70 mt-2 font-medium"
          >
            {MODES.find((m) => m.id === scanMode)?.caption}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Bottom controls — capture + gallery + type-instead */}
      <div className="absolute bottom-0 inset-x-0 z-10 px-6 pb-10 pb-safe">
        <div className="flex items-end justify-between">
          {/* Gallery */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
            <ImageIcon size={20} />
          </motion.button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

          {/* CAPTURE button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleCapture}
            disabled={capturing || !!error}
            className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl disabled:opacity-50"
          >
            <div className="w-16 h-16 rounded-full ring-4 ring-black/20 bg-white" />
            {capturing && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.4, opacity: 0 }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-white/30"
              />
            )}
          </motion.button>

          {/* TYPE INSTEAD — now obvious with label */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setTextMode(true)}
            className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
              <Type size={20} />
            </div>
            <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Taper</span>
          </motion.button>
        </div>
      </div>

      {/* Error overlay */}
      {error && (
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-32 inset-x-4 z-20 p-4 rounded-2xl bg-red-500/90 backdrop-blur-md text-white text-sm font-medium text-center">
          {error}
        </motion.div>
      )}
    </div>
  );
}
