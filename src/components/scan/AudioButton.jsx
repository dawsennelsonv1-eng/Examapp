// src/components/scan/AudioButton.jsx
// Plays solution audio. Uses the new ttsService.

import { useState, useEffect } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { speakText, stopSpeaking } from "../../services/ttsService";

export default function AudioButton({ text, label = "Écouter" }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Stop audio if component unmounts mid-playback
    return () => {
      if (playing) stopSpeaking();
    };
    // eslint-disable-next-line
  }, []);

  const handleToggle = async () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }

    if (!text) return;

    setLoading(true);
    try {
      setPlaying(true);
      await speakText(text, "fr-FR");
    } catch (err) {
      console.warn("Audio playback failed:", err);
    } finally {
      setPlaying(false);
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={handleToggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 text-xs font-semibold"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : playing ? (
        <VolumeX size={14} />
      ) : (
        <Volume2 size={14} />
      )}
      {playing ? "Arrêter" : label}
    </motion.button>
  );
}
