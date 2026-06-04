// src/components/classroom/CallTutorSession.jsx
// v11: Full-screen real-time voice call with the tutor via Gemini Live.
// Features: voice in/out, camera share (front/back toggle), persona avatar, waveform.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, PhoneOff, Camera, CameraOff, SwitchCamera,
  Mic, MicOff, Volume2, Loader2, X,
} from "lucide-react";
import TutorAvatar from "../shared/TutorAvatar";
import { createLiveSession } from "../../services/liveService";
import { PERSONALITIES } from "../../utils/constants";

export default function CallTutorSession({
  personaId,
  exerciseContext = null,
  language = "mix",
  studentName = "",
  onEnd,
}) {
  const [status, setStatus] = useState("connecting"); // connecting | ready | recording | speaking | error
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [micMuted, setMicMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const sessionRef = useRef(null);
  const videoRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const persona = PERSONALITIES.find((p) => p.id === personaId) || PERSONALITIES[0];

  useEffect(() => {
    initSession();
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => {
      clearInterval(interval);
      sessionRef.current?.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  const initSession = async () => {
    try {
      const session = await createLiveSession({
        persona: personaId,
        language,
        exerciseContext,
        studentName,
        onTranscript: ({ role, text }) => {
          setTranscript((prev) => [...prev.slice(-10), { role, text, ts: Date.now() }]);
        },
        onStatus: (s) => setStatus(s),
        onError: (err) => {
          setError(err.message || "Erreur de connexion");
          setStatus("error");
        },
        onTutorTurn: () => setStatus("speaking"),
      });
      sessionRef.current = session;

      // Wait for ready then start recording
      const checkReady = setInterval(async () => {
        if (session.isConnected) {
          clearInterval(checkReady);
          await session.startRecording();
        }
      }, 200);
    } catch (err) {
      setError(err.message || "Pa kapab konekte. Verifye koneksyon w.");
      setStatus("error");
    }
  };

  const toggleMic = () => {
    const session = sessionRef.current;
    if (!session) return;
    if (micMuted) {
      session.startRecording();
    } else {
      session.stopRecording();
    }
    setMicMuted(!micMuted);
  };

  const toggleCamera = async () => {
    const session = sessionRef.current;
    if (!session) return;
    if (cameraOn) {
      session.stopCamera();
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraOn(false);
    } else {
      try {
        const stream = await session.startCamera(facingMode);
        if (!stream) throw new Error("no-stream");
        setCameraOn(true);
        // assign after the element is shown
        requestAnimationFrame(() => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        });
      } catch (err) {
        console.warn("Camera start failed:", err);
        setError("Impossible de démarrer la caméra. Vérifie la permission et réessaie.");
        setCameraOn(false);
      }
    }
  };

  const switchCamera = async () => {
    const session = sessionRef.current;
    if (!session || !cameraOn) return;
    const newMode = facingMode === "environment" ? "user" : "environment";
    try {
      session.stopCamera();
      const stream = await session.startCamera(newMode);
      if (!stream) throw new Error("no-stream");
      setFacingMode(newMode);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch (err) {
      console.warn("Camera switch failed:", err);
      setError("Impossible de changer de caméra sur cet appareil.");
    }
  };

  const handleEndCall = () => {
    sessionRef.current?.disconnect();
    onEnd?.();
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 flex flex-col">
      {/* Top status bar */}
      <header className="flex items-center justify-between p-4 text-white">
        <button
          onClick={handleEndCall}
          className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
        >
          <X size={18} />
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold flex items-center gap-1.5 justify-center">
            {status === "connecting" && (
              <>
                <Loader2 size={10} className="animate-spin" />
                Connexion...
              </>
            )}
            {status === "ready" && <>● Prêt</>}
            {status === "recording" && <span className="text-emerald-400">● En direct</span>}
            {status === "speaking" && <span className="text-amber-400">● Le prof parle</span>}
            {status === "turn_complete" && <span className="text-emerald-400">● En direct</span>}
            {status === "error" && <span className="text-red-400">● Erreur</span>}
          </div>
          <div className="text-sm font-bold">{formatTime(callDuration)}</div>
        </div>
        <div className="w-9" />
      </header>

      {/* Main area: tutor avatar OR camera */}
      <div className="flex-1 flex items-center justify-center px-6 relative">
        {/* Video is ALWAYS mounted (just hidden when camera is off) so that
            videoRef.current exists the moment we assign srcObject — this was the
            cause of the black-camera bug (ref was null on first toggle). */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full max-w-md aspect-square rounded-3xl object-cover bg-black ${cameraOn ? "block" : "hidden"}`}
        />
        {cameraOn ? (
          <div className="absolute top-4 right-4">
            <TutorAvatar personaId={personaId} size="md" speaking={status === "speaking"} glow />
          </div>
        ) : (
          <div className="text-center">
            <motion.div
              animate={status === "speaking" ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <TutorAvatar personaId={personaId} size="xl" speaking={status === "speaking"} glow />
            </motion.div>
            <h2 className="mt-6 text-2xl font-black text-white">{persona.name}</h2>
            <p className="text-sm text-white/60 mt-1">{persona.title}</p>

            {(status === "speaking" || status === "recording") && (
              <div className="mt-6 flex items-center justify-center gap-1.5 h-8">
                {[...Array(7)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-1.5 rounded-full ${status === "speaking" ? "bg-amber-400" : "bg-emerald-400"}`}
                    animate={{ height: ["12px", "32px", "12px"] }}
                    transition={{ duration: 0.6 + i * 0.08, repeat: Infinity, delay: i * 0.05 }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transcript (live captions) */}
      {transcript.length > 0 && (
        <div className="max-h-32 overflow-y-auto px-4 mb-2 space-y-1">
          <AnimatePresence>
            {transcript.slice(-3).map((m, i) => (
              <motion.div
                key={`${m.ts}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-xs ${m.role === "user" ? "text-cyan-300" : "text-white/90"} px-3`}
              >
                <span className="text-[10px] uppercase tracking-wider opacity-60 font-bold mr-2">
                  {m.role === "user" ? "Toi" : persona.name}:
                </span>
                {m.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mx-4 mb-3 p-3 rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-100 text-xs"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <div className="p-6 pb-8">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Camera toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleCamera}
            disabled={status === "connecting" || status === "error"}
            className={`w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center disabled:opacity-30 transition-colors ${
              cameraOn ? "bg-cyan-500/30 text-cyan-300" : "bg-white/10 text-white"
            }`}
          >
            {cameraOn ? <Camera size={22} /> : <CameraOff size={22} />}
          </motion.button>

          {/* Camera switch (only when camera on) */}
          {cameraOn ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={switchCamera}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
            >
              <SwitchCamera size={18} />
            </motion.button>
          ) : (
            <div className="w-12" />
          )}

          {/* END CALL */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-xl shadow-red-500/50"
          >
            <PhoneOff size={26} fill="currentColor" />
          </motion.button>

          {/* Mic toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleMic}
            disabled={status === "connecting" || status === "error"}
            className={`w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center disabled:opacity-30 transition-colors ${
              micMuted ? "bg-red-500/30 text-red-300" : "bg-white/10 text-white"
            }`}
          >
            {micMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </motion.button>

          {/* Spacer */}
          <div className="w-12" />
        </div>

        <p className="text-center text-[10px] text-white/40 mt-4 uppercase tracking-widest font-bold">
          Gemini Live · Premium
        </p>
      </div>
    </div>
  );
}
