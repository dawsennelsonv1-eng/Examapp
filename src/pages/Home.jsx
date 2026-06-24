// src/pages/Home.jsx
// v17: Correct exam dates (9AF 29 juin–2 juillet, NS4 3–7 juillet). No MENFP wording.

import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Edit3, ChevronRight, Flame,
  Scan, Sparkles, Target, X, CalendarDays, Clock,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { useStreak } from "../hooks/useStreak";
import { useEffectiveTrack } from "../hooks/useAdminAccess";
import { EXAM_DATES, PERSONALITIES, PLAN_PRICES } from "../utils/constants";
import { useAppConfig } from "../hooks/useAppConfig";
import { useClassroomSessions } from "../hooks/useClassroom";
import GettingStarted from "../components/GettingStarted";
import ReferralCard from "../components/ReferralCard";
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
  const { streak } = useStreak();
  const track = useEffectiveTrack(); // admin class preview-aware
  const { config } = useAppConfig();
  const { getLastSessionSummary } = useClassroomSessions();

  // Launch-discount banner (free users only): live countdown + WhatsApp pay.
  // Read the LIVE plan from the DB (the context profile can be stale right after
  // an admin grant), so granted users immediately see the correct offer.
  const [livePlan, setLivePlan] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) return;
        const { data: p } = await supabase.from("profiles").select("plan_tier").eq("id", uid).single();
        if (alive && p) setLivePlan(p.plan_tier || "free");
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, []);
  const planTier = livePlan || profile?.plan_tier || "free";
  const isPaid = planTier === "basic" || planTier === "premium";
  const upgradeDiff = Math.max((PLAN_PRICES.premium || 1200) - (PLAN_PRICES.basic || 750), 0);
  const [showPromo, setShowPromo] = useState(true);
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const promoBasic = getPlanPricing("basic");
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

  // Honest quick actions (real navigation, no fabricated chapters/counts).
  const quickActions = [
    { icon: Scan, title: "Scanner un exercice", subtitle: "Photo → solution expliquée", color: "from-violet-600 to-indigo-700", route: "/scan" },
    { icon: Edit3, title: "Faire un quiz", subtitle: "Teste-toi par matière", color: "from-emerald-500 to-teal-600", route: "/quiz" },
    { icon: BookOpen, title: "Réviser un cours", subtitle: "Leçons et chapitres", color: "from-amber-500 to-orange-600", route: "/cours" },
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

        {/* Offre Basic — utilisateurs GRATUITS seulement → page de paiement */}
        <AnimatePresence>
          {planTier === "free" && showPromo && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="relative"
            >
              <button onClick={() => setShowPromo(false)}
                className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                <X size={12} className="text-white/80" />
              </button>
              <button
                onClick={() => navigate("/paywall")}
                className="w-full text-left rounded-2xl p-5 text-white shadow-xl bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-900 relative overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-400/15 blur-2xl" />
                <div className="flex items-center justify-between mb-2 pr-6">
                  <span className="text-[10px] uppercase tracking-widest font-black text-amber-300">Offre spéciale</span>
                  {promoBasic.active && promoBasic.savings > 0 && (
                    <span className="text-[11px] font-black text-white bg-emerald-500 px-2 py-0.5 rounded-full">
                      -{promoBasic.savings} HTG
                    </span>
                  )}
                </div>
                <div className="text-xl font-black leading-tight">Plan Basic</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black">{promoBasic.price} HTG</span>
                  {promoBasic.active && promoBasic.savings > 0 && (
                    <span className="text-sm text-white/50 line-through">{promoBasic.anchor} HTG</span>
                  )}
                </div>
                <div className="text-xs text-white/75 mt-0.5">Accès complet jusqu'aux examens</div>
                <div className="text-[11px] text-amber-200/90 mt-1.5 font-semibold">
                  Moins cher qu'un répétiteur — et disponible 24h/24.
                </div>
                {promoBasic.active && promoCountdown && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-200">
                    <Clock size={12} /> Se termine dans <span className="tabular-nums">{promoCountdown}</span>
                  </div>
                )}
                <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-bold">
                  Profiter de l'offre <ChevronRight size={16} />
                </div>
                <div className="text-[11px] text-white/55 mt-2">Plan Premium également disponible</div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mise à niveau — pour les abonnés BASIC seulement → Premium au prix de la différence */}
        <AnimatePresence>
          {planTier === "basic" && showPromo && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="relative"
            >
              <button onClick={() => setShowPromo(false)}
                className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                <X size={12} className="text-white/80" />
              </button>
              <button
                onClick={() => navigate("/paywall?plan=premium")}
                className="w-full text-left rounded-2xl p-5 text-white shadow-xl bg-gradient-to-br from-amber-600 via-orange-600 to-slate-900 relative overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-300/20 blur-2xl" />
                <span className="text-[10px] uppercase tracking-widest font-black text-amber-200">Passe à Premium</span>
                <div className="text-xl font-black leading-tight mt-1">Débloque tout le Premium</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black">+{upgradeDiff} HTG</span>
                  <span className="text-xs text-white/70">seulement (tu as déjà payé Basic)</span>
                </div>
                <div className="text-[11px] text-amber-100/90 mt-1.5 font-semibold">
                  Plus d'appels avec le prof, tout illimité jusqu'aux examens.
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-bold">
                  Passer à Premium <ChevronRight size={16} />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <ReferralCard />

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
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Que veux-tu faire ?</h2>
          </div>
          <div className="space-y-3">
            {quickActions.map((m, i) => {
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
                  <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Real consistency streak (no fabricated leaderboard) */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Flame size={16} className="text-orange-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Ta régularité</h2>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-5 text-white shadow-md shadow-orange-500/30 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Flame size={28} fill="currentColor" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tabular-nums">{streak}</span>
                <span className="text-sm font-semibold opacity-90">{streak > 1 ? "jours de suite" : "jour"}</span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                {streak > 1 ? "Continue comme ça, ne casse pas la série !" : "Reviens demain pour continuer ta série."}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
