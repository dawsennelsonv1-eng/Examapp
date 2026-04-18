import { motion } from "framer-motion";
import { useApp } from "../contexts/AppContext";

export default function Onboarding() {
  const { t, setTrack, lang, toggleLang, TRACKS } = useApp();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-700 to-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <button
        onClick={toggleLang}
        className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium ring-1 ring-white/20"
      >
        {lang === "fr" ? "🇭🇹 Kreyòl" : "🇫🇷 Français"}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-3xl font-bold mb-3">{t("onboarding_title")}</h1>
        <p className="text-white/70">{t("onboarding_subtitle")}</p>
      </motion.div>

      <div className="w-full max-w-sm space-y-3">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setTrack(TRACKS.NINE_AF)}
          className="w-full p-5 rounded-2xl bg-white text-slate-900 font-bold text-lg shadow-xl shadow-indigo-900/50 flex items-center justify-between"
        >
          <span>{t("track_9af")}</span>
          <span className="text-indigo-600">→</span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setTrack(TRACKS.NS4)}
          className="w-full p-5 rounded-2xl bg-white text-slate-900 font-bold text-lg shadow-xl shadow-indigo-900/50 flex items-center justify-between"
        >
          <span>{t("track_ns4")}</span>
          <span className="text-indigo-600">→</span>
        </motion.button>
      </div>
    </div>
  );
}
