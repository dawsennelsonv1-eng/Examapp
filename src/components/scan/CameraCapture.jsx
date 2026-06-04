// src/components/scan/CameraCapture.jsx — v24 (Package 1)
// Redesign:
//  - Video fills the WHOLE screen (object-cover, absolute inset-0).
//  - Bigger scanner frame with animated corner brackets.
//  - Résoudre / Vérifier mode pills sit at the TOP, clear of the capture button,
//    each with a one-line description so the user knows what each does.
//  - Bottom bar: symmetric 3-column grid [Galerie] [Capture] [Texte], the text
//    button is clearly labelled "Texte" so it's obvious it's for typing.
//  - Camera errors no longer leave a black box silently; a retry is shown.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ImageIcon, Type, Zap, ZapOff, RotateCw, Send,
  Camera as CameraIcon, FileCheck, RefreshCw,
} from "lucide-react";

const MODE_INFO = {
  solve:  { label: "Résoudre", desc: "Photographie un exercice, le prof le résout.", icon: CameraIcon },
  verify: { label: "Vérifier", desc: "Tu l'as déjà fait ? Le prof corrige ton travail.", icon: FileCheck },
};

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [mode, setMode] = useState("solve");
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
      setError(null);
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: fm, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera failed:", err);
      setError("Impossible d'ouvrir la caméra. Accepte la permission, puis réessaie.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const toggleFacing = () => setFacingMode(facingMode === "environment" ? "user" : "environment");

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch {
      /* torch unsupported — ignore */
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
    reader.onload = (ev) => { stopCamera(); onCapture(ev.target.result, null, mode); };
    reader.readAsDataURL(file);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    stopCamera();
    onCapture(null, textInput.trim(), mode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* FULL-SCREEN video */}
      {!textMode && (
        <>
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white/80 gap-4">
              <p className="text-sm leading-relaxed">{error}</p>
              <button onClick={() => startCamera(facingMode)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md text-white text-sm font-bold">
                <RefreshCw size={15} /> Réessayer
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Bigger scanner frame with corner brackets */}
          {!error && (
            <div className="pointer-events-none absolute inset-x-5 top-36 bottom-44">
              <div className="relative w-full h-full">
                {/* four corners */}
                <span className="absolute top-0 left-0 w-9 h-9 border-t-4 border-l-4 border-white/80 rounded-tl-2xl" />
                <span className="absolute top-0 right-0 w-9 h-9 border-t-4 border-r-4 border-white/80 rounded-tr-2xl" />
                <span className="absolute bottom-0 left-0 w-9 h-9 border-b-4 border-l-4 border-white/80 rounded-bl-2xl" />
                <span className="absolute bottom-0 right-0 w-9 h-9 border-b-4 border-r-4 border-white/80 rounded-br-2xl" />
                {/* scanning sweep */}
                <motion.div
                  initial={{ top: "4%" }}
                  animate={{ top: ["4%", "96%", "4%"] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-2 right-2 h-0.5 bg-violet-400/80 shadow-[0_0_12px_2px_rgba(167,139,250,0.7)]"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Top bar */}
      {!textMode && (
        <div className="absolute top-0 inset-x-0 z-10 px-4 pt-4 pb-3 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between">
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
      )}

      {/* Mode selector + description (clear of the capture button) */}
      {!textMode && (
        <div className="absolute top-[68px] inset-x-0 z-10 flex flex-col items-center px-4 gap-1.5">
          <div className="inline-flex p-1 rounded-full bg-black/55 backdrop-blur-md ring-1 ring-white/10">
            {Object.entries(MODE_INFO).map(([key, info]) => {
              const Icon = info.icon;
              return (
                <button key={key} onClick={() => setMode(key)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    mode === key ? "bg-white text-slate-900" : "text-white/80"
                  }`}>
                  <Icon size={13} />{info.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-white/75 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full max-w-[20rem] text-center">
            {MODE_INFO[mode].desc}
          </p>
        </div>
      )}

      {/* Text input mode */}
      <AnimatePresence>
        {textMode && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            className="absolute inset-0 z-20 bg-slate-950 p-4 pt-24">
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
              autoFocus rows={8}
              className="w-full p-4 rounded-2xl bg-slate-900 text-white placeholder:text-slate-500 ring-1 ring-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleTextSubmit} disabled={!textInput.trim()}
              className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white font-black flex items-center justify-center gap-2 disabled:opacity-40">
              <Send size={18} />Envoyer
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom control bar — symmetric 3-column, labelled buttons */}
      {!textMode && (
        <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-8 px-6">
          <div className="grid grid-cols-3 items-end max-w-md mx-auto">
            {/* Left: Gallery */}
            <div className="flex flex-col items-center gap-1">
              <motion.button whileTap={{ scale: 0.92 }} onClick={handleGallery}
                className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white" aria-label="Galerie">
                <ImageIcon size={22} />
              </motion.button>
              <span className="text-[10px] font-semibold text-white/70">Galerie</span>
            </div>

            {/* Center: Capture FAB */}
            <div className="flex justify-center">
              <motion.button whileTap={{ scale: 0.92 }} onClick={handleCapture}
                className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl ring-4 ring-white/30"
                aria-label="Capturer">
                <div className="absolute inset-2 rounded-full bg-white ring-2 ring-black/20" />
              </motion.button>
            </div>

            {/* Right: Text input — clearly labelled */}
            <div className="flex flex-col items-center gap-1">
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => setTextMode(true)}
                className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white" aria-label="Taper le texte">
                <Type size={22} />
              </motion.button>
              <span className="text-[10px] font-semibold text-white/70">Texte</span>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
