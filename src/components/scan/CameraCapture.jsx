// src/components/scan/CameraCapture.jsx
// Wave 1: Flash button restored. Camera + text input fallback + photo upload.

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Camera, X, RefreshCw, Check, Type, Image as ImageIcon,
  Sparkles, Zap, ZapOff,
} from "lucide-react";

export default function CameraCapture({ onCapture, onClose }) {
  const [mode, setMode] = useState("camera");
  const [textInput, setTextInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [flashOn, setFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (mode !== "camera") {
      stopCamera();
      return;
    }
    startCamera();
    return stopCamera;
  }, [mode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      const capabilities = track.getCapabilities?.() || {};
      setHasFlash(Boolean(capabilities.torch));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Accès caméra refusé. Active la caméra dans les paramètres."
          : "Impossible d'accéder à la caméra."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    trackRef.current = null;
    setCameraReady(false);
    setFlashOn(false);
  };

  const toggleFlash = async () => {
    if (!trackRef.current || !hasFlash) return;
    try {
      const newState = !flashOn;
      await trackRef.current.applyConstraints({ advanced: [{ torch: newState }] });
      setFlashOn(newState);
    } catch (err) {
      console.warn("Flash toggle failed:", err);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreviewUrl(dataUrl);
    setMode("preview");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewUrl(ev.target.result);
      setMode("preview");
    };
    reader.readAsDataURL(file);
  };

  const confirmPhoto = () => {
    if (previewUrl) onCapture(previewUrl);
  };

  const retakePhoto = () => {
    setPreviewUrl(null);
    setMode("camera");
  };

  const submitText = () => {
    if (textInput.trim().length < 10) return;
    onCapture(null, textInput.trim());
  };

  if (mode === "preview" && previewUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <header className="p-4 flex items-center justify-between">
          <button onClick={retakePhoto} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
            <X size={20} />
          </button>
          <div className="text-white text-sm font-semibold">Aperçu</div>
          <div className="w-10" />
        </header>
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <img src={previewUrl} alt="Aperçu" className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
        <div className="p-4 flex gap-3">
          <motion.button whileTap={{ scale: 0.97 }} onClick={retakePhoto} className="flex-1 py-3 rounded-2xl bg-white/10 backdrop-blur-md text-white font-bold flex items-center justify-center gap-2">
            <RefreshCw size={18} />Reprendre
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={confirmPhoto} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-700 text-white font-bold shadow-xl flex items-center justify-center gap-2">
            <Check size={18} />Utiliser
          </motion.button>
        </div>
      </div>
    );
  }

  if (mode === "text") {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
        <header className="p-4 flex items-center justify-between bg-slate-800">
          <button onClick={() => setMode("camera")} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
            <X size={20} />
          </button>
          <div className="text-white text-sm font-semibold">Tape l'exercice</div>
          <button onClick={submitText} disabled={textInput.trim().length < 10} className="px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm disabled:opacity-40">
            Résoudre
          </button>
        </header>
        <div className="flex-1 p-4">
          <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Tape ou colle l'énoncé de ton exercice ici..." autoFocus className="w-full h-full p-4 rounded-2xl bg-slate-800 text-white text-base resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div className="p-4 text-center text-xs text-slate-400">
          {textInput.length} caractères {textInput.length < 10 && "(minimum 10)"}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <header className="p-4 flex items-center justify-between absolute top-0 inset-x-0 z-10">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white">
          <X size={20} />
        </button>
        <div className="text-white text-sm font-semibold bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full">
          Cadrer l'exercice
        </div>
        {hasFlash ? (
          <motion.button whileTap={{ scale: 0.9 }} onClick={toggleFlash} className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${flashOn ? "bg-amber-400 text-slate-900" : "bg-black/50 text-white"}`}>
            {flashOn ? <Zap size={20} fill="currentColor" /> : <ZapOff size={20} />}
          </motion.button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      <div className="flex-1 relative overflow-hidden">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-3xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Camera size={32} className="text-red-400" />
              </div>
              <p className="text-white mb-4">{cameraError}</p>
              <button onClick={() => setMode("text")} className="px-6 py-3 rounded-xl bg-violet-600 text-white font-bold">
                Taper l'exercice à la place
              </button>
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <Sparkles size={32} className="text-violet-400 animate-pulse" />
              </div>
            )}
            {cameraReady && (
              <div className="absolute inset-12 border-2 border-white/30 rounded-3xl pointer-events-none">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-4 bg-gradient-to-t from-black to-transparent">
        <div className="flex items-center justify-around gap-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMode("text")} className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
            <Type size={20} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={takePhoto} disabled={!cameraReady} className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl disabled:opacity-50">
            <div className="w-16 h-16 rounded-full ring-4 ring-violet-500" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
            <ImageIcon size={20} />
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </motion.button>
        </div>
        <p className="text-center text-xs text-white/70 mt-3">
          {hasFlash ? "Photo, texte ou image — flash dispo en haut" : "Photo, texte ou image"}
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
