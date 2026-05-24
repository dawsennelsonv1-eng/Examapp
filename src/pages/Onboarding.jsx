// src/pages/Onboarding.jsx
// One-tap entry: pick 9AF or NS4, then navigate to home.

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";

export default function Onboarding() {
  const { t, setTrack, TRACKS } = useApp();
  const navigate = useNavigate();

  const handleSelect = (trackValue) => {
    setTrack(trackValue);
    // Give state a tick to persist, then navigate
    setTimeout(() => navigate("/", { replace: true }), 50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-700 to-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-3xl font-bold mb-3">
          {t("onboarding_title") || "Quel examen vas-tu conquérir ?"}
        </h1>
        <p className="text-white/70">
          {t("onboarding_subtitle") || "Choisis ton parcours. On s'occupe du reste."}
        </p>
      </motion.div>

      <div className="w-full max-w-sm space-y-3">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSelect(TRACKS.NINE_AF)}
          className="w-full p-5 rounded-2xl bg-white text-slate-900 font-bold text-lg shadow-xl shadow-indigo-900/50 flex items-center justify-between"
        >
          <span>{t("track_9af") || "9ème AF"}</span>
          <span className="text-indigo-600">→</span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSelect(TRACKS.NS4)}
          className="w-full p-5 rounded-2xl bg-white text-slate-900 font-bold text-lg shadow-xl shadow-indigo-900/50 flex items-center justify-between"
        >
          <span>{t("track_ns4") || "Nouveau Secondaire IV"}</span>
          <span className="text-indigo-600">→</span>
        </motion.button>
      </div>
    </div>
  );
}
