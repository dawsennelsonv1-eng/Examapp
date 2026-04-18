// src/components/scan/AudioButton.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { speak, stop, isSupported } from "../../services/ttsService";
import { useApp } from "../../contexts/AppContext";

export default function AudioButton({ text, className = "", label }) {
  const { lang, t } = useApp();
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => stop(), []); // cleanup on unmount

  if (!isSupported()) return null;

  const handleClick = () => {
    if (playing) {
      stop();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    speak(text, lang, { onEnd: () => setPlaying(false) });
  };

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.05 }}
      onClick={handleClick}
      aria-label={label || t("audio_listen")}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
        bg-amber-500/10 text-amber-600 dark:text-amber-400
        hover:bg-amber-500/20 transition-colors
        ring-1 ring-amber-500/30 text-xs font-medium ${className}`}
    >
      <motion.span
        animate={playing ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={playing ? { repeat: Infinity, duration: 0.9 } : {}}
        className="inline-block"
      >
        {playing ? "⏸" : "🔊"}
      </motion.span>
      <span>{playing ? t("audio_stop") : t("audio_listen")}</span>
    </motion.button>
  );
}
