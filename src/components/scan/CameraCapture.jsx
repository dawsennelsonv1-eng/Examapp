// src/components/scan/CameraCapture.jsx — v23
// Fixes the alignment of Gallery + T (text input) icons. Bottom bar is now a clean
// 3-column layout: [Gallery] [Capture FAB] [Text input].

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ImageIcon, Type, Zap, ZapOff, RotateCw, Send,
  Camera as CameraIcon, FileCheck,
} from "lucide-react";

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [mode, setMode] = useState("solve"); // solve | verify
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
    // eslint-disable-next-line
  }, [facingMode]);

  const startCamera = async (fm) => {
    try {
      stopCamera();
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: fm, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera failed:", err);
      setError("Pa kapab louvri kamera a. Aksepte pèmisyon yo.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const toggleFacing = () => {
    setFacingMode(facingMode === "environment" ? "user" : "environment");
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch {
      // Torch unsupported on this device — silently ignore
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    stopCamera();
    onCapture(dataUrl, null, mode);
  };

  const handleGallery = () => fileInputRef.current?.click();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      stopCamera();
      onCapture(ev.target.result, null, mode);
    };
    reader.readAsDataURL(file);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    stopCamera();
    onCapture(null, textInput.trim(), mode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 px-4 pt-4 pb-4 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between">
        <button onClick={() => { stopCamera(); onClose(); }}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
          <X size={20} />
        </button>
        <div className="flex gap-2">
          <button onClick={toggleTorch}
            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center text-white ${torchOn ? "bg-amber-500" : "bg-white/15"}`}>
            {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
          </button>
          <button onClick={toggleFacing}
            className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
            <RotateCw size={18} />
          </button>
        </div>
      </div>

      {/* Mode selector pill */}
      <div className="absolute top-20 inset-x-0 z-10 flex justify-center px-4">
        <div className="inline-flex p-1 rounded-full bg-black/50 backdrop-blur-md ring-1 ring-white/10">
          <button
            onClick={() => setMode("solve")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              mode === "solve" ? "bg-white text-slate-900" : "text-white/80"
            }`}
          >
            <CameraIcon size={13} />Résoudre
          </button>
          <button
            onClick={() => setMode("verify")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              mode === "verify" ? "bg-white text-slate-900" : "text-white/80"
            }`}
          >
            <FileCheck size={13} />Vérifier
          </button>
        </div>
      </div>

      {/* Video preview */}
      {!textMode && (
        <div className="flex-1 relative overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white/80">
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          {/* Crosshair / corners guide */}
          <div className="pointer-events-none absolute inset-12 border-2 border-white/40 rounded-3xl" />
        </div>
      )}

      {/* Text input mode */}
      <AnimatePresence>
        {textMode && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute inset-0 z-20 bg-slate-950 p-4 pt-24"
          >
            <button onClick={() => setTextMode(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-white mb-2">Tape ton exercice</h2>
            <p className="text-sm text-slate-400 mb-4">Si la photo ne marche pas, écris-le ici.</p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Tape ou colle ton exercice ici..."
              autoFocus
              rows={8}
              className="w-full p-4 rounded-2xl bg-slate-900 text-white placeholder:text-slate-500 ring-1 ring-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
              className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white font-black flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Send size={18} />Envoyer
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom control bar — FIXED ALIGNMENT */}
      {!textMode && (
        <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-8 px-6">
          {/* 3-column equal grid — gallery LEFT, capture CENTER, text RIGHT, all vertically centered */}
          <div className="grid grid-cols-3 items-center max-w-md mx-auto">
            {/* Left: Gallery */}
            <div className="flex justify-start">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleGallery}
                className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white"
                aria-label="Galerie"
              >
                <ImageIcon size={22} />
              </motion.button>
            </div>

            {/* Center: Capture FAB */}
            <div className="flex justify-center">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleCapture}
                className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl"
                aria-label="Capturer"
              >
                <div className="w-16 h-16 rounded-full bg-white ring-4 ring-black/30" />
                <div className="absolute inset-2 rounded-full bg-white" />
              </motion.button>
            </div>

            {/* Right: Text input */}
            <div className="flex justify-end">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setTextMode(true)}
                className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white"
                aria-label="Taper le texte"
              >
                <Type size={22} />
              </motion.button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
