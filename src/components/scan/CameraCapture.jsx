// src/components/scan/CameraCapture.jsx
// Real fullscreen camera using getUserMedia API.
// Defaults to back camera, falls back to front if back is unavailable.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Image as ImageIcon, Zap, ZapOff, RefreshCw, Circle } from "lucide-react";

export default function CameraCapture({ onCapture, onClose, onOpenGallery }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // back camera
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Start camera stream
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        // Stop any existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        const constraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);

          // Check torch support
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities?.() || {};
          setTorchSupported(!!capabilities.torch);
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (err.name === "NotAllowedError") {
          setError("permission");
        } else if (err.name === "NotFoundError") {
          setError("notfound");
        } else {
          setError("generic");
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch (err) {
      console.warn("Torch not supported:", err);
    }
  };

  const flipCamera = () => {
    setReady(false);
    setFacingMode((f) => (f === "environment" ? "user" : "environment"));
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    // Haptic feedback on capture
    if (navigator.vibrate) navigator.vibrate(50);

    onCapture(dataUrl);
  };

  // Error states
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="text-6xl mb-4">📷</div>
        <h2 className="text-xl font-bold mb-2">
          {error === "permission" && "Pèmisyon kamera bezwen"}
          {error === "notfound" && "Pa gen kamera jwenn"}
          {error === "generic" && "Pwoblèm ak kamera a"}
        </h2>
        <p className="text-white/70 text-sm mb-6 max-w-xs">
          {error === "permission" &&
            "Aktive kamera nan paramèt navigatè ou pou w kapab skane pwoblèm yo."}
          {error === "notfound" && "Eseye sou yon aparèy ki gen kamera."}
          {error === "generic" && "Fèmen aplikasyon an epi ouvri l ankò."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onOpenGallery}
            className="px-6 py-3 rounded-full bg-violet-600 font-semibold"
          >
            Chaje yon foto
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-full bg-white/10 font-semibold"
          >
            Fèmen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Fullscreen video */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"
        >
          <X size={22} />
        </button>

        <div className="flex gap-2">
          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center text-white ${
                torchOn ? "bg-amber-500" : "bg-black/40"
              }`}
            >
              {torchOn ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>
          )}
          <button
            onClick={flipCamera}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Scan frame overlay */}
      {ready && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[85%] h-[55%] max-w-md">
              <CornerBrackets />
              {/* Animated scan line */}
              <motion.div
                initial={{ top: "0%" }}
                animate={{ top: "100%" }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }}
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent shadow-[0_0_12px_rgba(167,139,250,0.8)]"
              />
            </div>
          </div>

          {/* Hint text */}
          <div className="absolute top-20 left-0 right-0 text-center px-6 pointer-events-none">
            <p className="text-white/90 text-sm font-medium bg-black/40 backdrop-blur-md inline-block px-4 py-2 rounded-full">
              Pozisyone egzèsis ou andedan ankadreman an
            </p>
          </div>
        </>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 bg-gradient-to-t from-black/80 to-transparent z-10">
        <div className="flex items-center justify-around max-w-sm mx-auto">
          {/* Gallery button */}
          <button
            onClick={onOpenGallery}
            className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
            aria-label="Gallery"
          >
            <ImageIcon size={24} />
          </button>

          {/* Big capture button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleCapture}
            disabled={!ready}
            className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center disabled:opacity-50"
            aria-label="Capture"
          >
            <div className="absolute inset-0 rounded-full border-4 border-white" />
            <div className="w-16 h-16 rounded-full bg-white border-4 border-black/10" />
          </motion.button>

          {/* Placeholder for symmetry */}
          <div className="w-14 h-14" />
        </div>
      </div>

      {/* Loading overlay */}
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-4 border-white/20 border-t-violet-500"
          />
        </div>
      )}
    </div>
  );
}

function CornerBrackets() {
  const base = "absolute w-8 h-8 border-violet-400";
  return (
    <>
      <span className={`${base} -top-1 -left-1 border-t-4 border-l-4 rounded-tl-xl`} />
      <span className={`${base} -top-1 -right-1 border-t-4 border-r-4 rounded-tr-xl`} />
      <span className={`${base} -bottom-1 -left-1 border-b-4 border-l-4 rounded-bl-xl`} />
      <span className={`${base} -bottom-1 -right-1 border-b-4 border-r-4 rounded-br-xl`} />
    </>
  );
}
