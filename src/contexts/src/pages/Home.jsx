import { motion } from "framer-motion";
import { useApp } from "../contexts/AppContext";
import { EXAM_DATE } from "../utils/constants";

function daysUntilExam() {
  const now = new Date();
  const diff = EXAM_DATE - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function Home() {
  const { t, track, lang, toggleLang, theme, toggleTheme } = useApp();
  const days = daysUntilExam();

  const missions = [
    { icon: "🧮", title: t("master_formulas"), count: 2, color: "from-indigo-500 to-violet-600" },
    { icon: "📖", title: lang === "ht" ? "Li 1 tèks istwa" : "Lis 1 texte d'histoire", count: 1, color: "from-amber-500 to-orange-600" },
    { icon: "✍️", title: lang === "ht" ? "Fè 5 kesyon kwiz" : "Fais 5 questions de quiz", count: 5, color: "from-emerald-500 to-teal-600" },
  ];

  const leaderboard = [
    { rank: 1, score: 94, you: false },
    { rank: 2, score: 89, you: false },
    { rank: 3, score: 82, you: true },
    { rank: 4, score: 78, you: false },
  ];

  return (
    <div className="pb-24">
      <header className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6 pb-10 rounded-b-3xl shadow-xl shadow-indigo-500/20">
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
            {track}
          </span>
          <div className="flex gap-2">
            <button onClick={toggleLang} className="px-3 py-1 rounded-full bg-white/20 text-sm">
              {lang === "fr" ? "HT" : "FR"}
            </button>
            <button onClick={toggleTheme} className="px-3 py-1 rounded-full bg-white/20 text-sm">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-6xl font-bold mb-1">{days}</div>
          <div className="text-sm text-white/80">
            {lang === "ht" ? "jou anvan egzamen an" : "jours avant l'examen"}
          </div>
          <p className="mt-4 text-sm text-white/90 leading-relaxed">
            {t("countdown_prefix")} {t("countdown_question")}
          </p>
        </motion.div>
      </header>

      <main className="px-4 py-6 space-y-6 -mt-4">
        {/* Daily missions */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 px-1">
            {t("daily_mission")}
          </h2>
          <div className="space-y-3">
            {missions.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm flex items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-2xl`}>
                  {m.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {m.count} {lang === "ht" ? "tach" : "tâches"}
                  </div>
                </div>
                <div className="text-2xl">›</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Leaderboard */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 px-1">
            {t("leaderboard")}
          </h2>
          <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            {leaderboard.map((l) => (
              <div
                key={l.rank}
                className={`flex items-center gap-4 p-4 border-b last:border-b-0 border-slate-100 dark:border-slate-700 ${
                  l.you ? "bg-indigo-50 dark:bg-indigo-950/30" : ""
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  l.rank === 1 ? "bg-amber-400 text-amber-900" :
                  l.rank === 2 ? "bg-slate-300 text-slate-700" :
                  l.rank === 3 ? "bg-orange-400 text-orange-900" :
                  "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}>
                  {l.rank}
                </div>
                <div className="flex-1 font-medium">
                  {l.you ? (lang === "ht" ? "Ou menm" : "Toi") : (lang === "ht" ? "Elèv anonim" : "Élève anonyme")}
                </div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400">
                  {l.score}%
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
