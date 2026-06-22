// src/pages/Home.jsx
// v17: Correct exam dates (9AF 29 juin–2 juillet, NS4 3–7 juillet). No MENFP wording.

import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Calculator, BookOpen, Edit3, ChevronRight, Trophy, Flame,
  Scan, Sparkles, Target, X, CalendarDays, Clock,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { useEffectiveTrack } from "../hooks/useAdminAccess";
import { EXAM_DATES, PERSONALITIES } from "../utils/constants";
import { useAppConfig } from "../hooks/useAppConfig";
import { useClassroomSessions } from "../hooks/useClassroom";
import WhatsAppPayButton from "../components/WhatsAppPayButton";
import { getPlanPricing, promoEndsAt, formatCountdown } from "../utils/promo";
import ScanHistoryCard from "../components/home/ScanHistoryCard";
import ProgressCard from "../components/ProgressCard";
import TutorAvatar from "../components/shared/TutorAvatar";
import { useState, useEffect } from "react";

function daysUntil(date) {
  const diff = date - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function Home() {
  const navigate = useNavigate();
  const { preferences } = useApp();
  const { profile } = useAuth();
  const track = useEffectiveTrack(); // admin class preview-aware
  const { config } = useAppConfig();
  const { getLastSessionSummary } = useClassroomSessions();

  // Launch-discount banner (free users only): live countdown + WhatsApp pay.
  const isPaid = profile?.plan_tier === "basic" || profile?.plan_tier === "premium";
  const [showPromo, setShowPromo] = useState(true);
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const promoPricing = getPlanPricing("premium");
  const promoCountdown = formatCountdown(promoEndsAt() - nowTs);
  // Exam date/range come from the admin config (live-editable), falling back to
  // the constants defaults when config isn't loaded.
  const fallbackExam = EXAM_DATES[track] || EXAM_DATES.NS4;
  const cfgStart = track === "9AF" ? config?.exam_9af_start : config?.exam_ns4_start;
  const cfgRange = track === "9AF" ? config?.exam_9af_range : config?.exam_ns4_range;
  const examInfo = {
    start: cfgStart ? new Date(cfgStart) : fallbackExam.start,
    range: cfgRange || fallbackExam.range,
    label: fallbackExam.label,
  };
  const days = daysUntil(examInfo.start);
  const name = preferences?.name || "champion";

  const [showRememberBanner, setShowRememberBanner] = useState(true);
  const lastSession = getLastSessionSummary ? getLastSessionSummary() : null;

  const showBanner =
    showRememberBanner &&
    lastSession &&
    Date.now() - lastSession.timestamp < 7 * 24 * 60 * 60 * 1000;
  const tutorPersona =
    PERSONALITIES.find((p) => p.id === (lastSession?.lastPersonaId || preferences?.personality)) ||
    PERSONALITIES[0];

  const handleResumeSession = () => {
    if (lastSession?.sessionId) navigate(`/classe?session=${lastSession.sessionId}`);
    else navigate("/classe");
  };

  const missions = [
    { icon: Calculator, title: "Maîtrise 2 formules", subtitle: "Physique - Chapitre 5", count: 2, color: "from-violet-600 to-indigo-700", route: "/reviser" },
    { icon: BookOpen, title: "Lis 1 texte d'histoire", subtitle: "Sciences Sociales", count: 1, color: "from-amber-500 to-orange-600", route: "/reviser" },
    { icon: Edit3, title: "Fais 5 questions de quiz", subtitle: "Toutes matières", count: 5, color: "from-emerald-500 to-teal-600", route: "/quiz" },
  ];

  const leaderboard = [
    { rank: 1, name: "Tania M.", score: 94 },
    { rank: 2, name: "Joseph P.", score: 89 },
    { rank: 3, name, score: 82, you: true },
    { rank: 4, name: "Marie L.", score: 78 },
  ];

  return (
    <div className="pb-24">
      <header className="relative bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 text-white p-6 pb-12 rounded-b-3xl shadow-2xl shadow-violet-500/30 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute bottom-0 -left-10 w-32 h-32 rounded-full bg-violet-400/30 blur-3xl" />

        <div className="relative flex justify-between items-center mb-6">
          <span className="text-xs font-bold bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full ring-1 ring-white/20">
            {examInfo.label}
          </span>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <p className="text-sm text-white/80 mb-1">Salut {name},</p>
          <div className="flex items-baseline gap-2 mb-1">
            <div className="text-6xl font-black tracking-tight">{days}</div>
            <div className="text-sm font-semibold text-white/90 pb-1">jours</div>
          </div>
          <p className="text-sm text-white/70">avant ton examen</p>

          {/* Both exam windows shown clearly */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
            <CalendarDays size={13} />
            <span className="text-xs font-semibold">{examInfo.range}</span>
          </div>

          <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/scan")}
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-violet-700 font-bold text-sm shadow-xl">
            <Scan size={18} />Scanner un exercice
          </motion.button>
        </motion.div>
      </header>

      <main className="px-4 py-6 space-y-6 -mt-4 relative z-10">
        <ProgressCard />

        {/* Launch-discount banner — free users only */}
        <AnimatePresence>
          {!isPaid && showPromo && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="relative rounded-2xl p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 ring-1 ring-emerald-500/30"
            >
              <button onClick={() => setShowPromo(false)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                <X size={12} className="text-slate-500 dark:text-slate-300" />
              </button>
              <div className="pr-6 mb-3">
                <div className="text-[10px] uppercase tracking-widest font-black text-emerald-600 dark:text-emerald-400 mb-1">
                  Òf espesyal
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  Premium {promoPricing.price} HTG jiska egzamen
                  {promoPricing.active && promoPricing.savings > 0 && (
                    <span className="text-slate-400 dark:text-slate-500 line-through font-normal text-xs ml-2">{promoPricing.anchor} HTG</span>
                  )}
                </p>
                {promoPricing.active && promoCountdown && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <Clock size={12} /> Fini nan <span className="tabular-nums">{promoCountdown}</span>
                  </div>
                )}
              </div>
              <WhatsAppPayButton planId="premium" />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/40 p-4 border border-violet-200 dark:border-violet-700/40"
            >
              <button
                onClick={() => setShowRememberBanner(false)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center"
              >
                <X size={12} className="text-slate-500" />
              </button>
              <div className="flex items-start gap-3 pr-6">
                <TutorAvatar personaId={tutorPersona.id} size="md" />
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-widest font-black text-violet-700 dark:text-violet-300 mb-0.5">
                    {tutorPersona.name} se souvient
                  </div>
                  <p className="text-sm text-slate-900 dark:text-white leading-snug mb-2">
                    {lastSession.didComplete
                      ? `Bon travay sou "${lastSession.lastTopic?.substring(0, 60)}..." Ann travay yon nouvo bagay ?`
                      : `Nan dènye fwa nou te wè, ou te gen difikilte ak "${lastSession.lastTopic?.substring(0, 60)}..." Vle nou reprann?`}
                  </p>
                  <button
                    onClick={handleResumeSession}
                    className="text-xs font-bold text-violet-700 dark:text-violet-300 inline-flex items-center gap-1"
                  >
                    Continuer <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/classe")}
          className="w-full rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 p-4 text-white shadow-lg shadow-orange-500/30 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <Sparkles size={24} />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[10px] uppercase tracking-widest font-black opacity-90">Salle de classe</div>
            <div className="font-bold text-base">Demande au prof une explication</div>
          </div>
          <ChevronRight size={22} />
        </motion.button>

        <ScanHistoryCard />

        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Target size={16} className="text-violet-600 dark:text-violet-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Missions du jour</h2>
          </div>
          <div className="space-y-3">
            {missions.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.button key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} whileTap={{ scale: 0.98 }} onClick={() => navigate(m.route)}
                  className="w-full rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-md shadow-slate-200/50 dark:shadow-slate-900/50 flex items-center gap-4 text-left ring-1 ring-slate-100 dark:ring-slate-700">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                    <Icon size={22} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{m.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.subtitle}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{m.count}</span>
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Trophy size={16} className="text-amber-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Classement</h2>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-md shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden ring-1 ring-slate-100 dark:ring-slate-700">
            {leaderboard.map((l) => (
              <div key={l.rank} className={`flex items-center gap-4 px-4 py-3 border-b last:border-b-0 border-slate-100 dark:border-slate-700 ${
                l.you ? "bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40" : ""
              }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                  l.rank === 1 ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-900" :
                  l.rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-700" :
                  l.rank === 3 ? "bg-gradient-to-br from-orange-400 to-amber-500 text-orange-900" :
                  "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}>
                  {l.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm truncate ${l.you ? "text-violet-700 dark:text-violet-300" : "text-slate-900 dark:text-white"}`}>
                    {l.you ? `${l.name} (toi)` : l.name}
                  </div>
                </div>
                <div className={`font-black text-base ${l.you ? "text-violet-600 dark:text-violet-400" : "text-slate-700 dark:text-slate-300"}`}>
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
