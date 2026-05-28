// src/pages/Profile.jsx
// v15: Full Profile with APP VERSION shown in an "À propos" section at the bottom.
// Tap the version 5x to reveal a link to /api/diag for debugging.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Edit2, Check, X, Settings, Crown, Zap,
  Moon, Sun, Sparkles, RotateCcw, Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { useUsage } from "../hooks/useUsage";
import { PERSONALITIES, LANGUAGE_OPTIONS, STORAGE_KEYS } from "../utils/constants";
import { APP_VERSION, BUILD_DATE, BUILD_NOTES } from "../utils/version";

export default function Profile() {
  const navigate = useNavigate();
  const { track, preferences, setPreferences, theme, toggleTheme } = useApp();
  const { planTier } = useUsage();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(preferences?.name || "");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showPersonalityPicker, setShowPersonalityPicker] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [versionTaps, setVersionTaps] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

  const saveName = () => {
    if (nameInput.trim().length >= 2) {
      setPreferences({ ...preferences, name: nameInput.trim() });
      setEditingName(false);
    }
  };

  const changeLanguage = (lang) => {
    setPreferences({ ...preferences, language: lang });
    setShowLangPicker(false);
  };

  const changePersonality = (p) => {
    setPreferences({ ...preferences, personality: p });
    setShowPersonalityPicker(false);
  };

  const resetEverything = () => {
    try {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem("laureat.classroom.sessions");
      localStorage.removeItem("laureat.quizCache");
      localStorage.removeItem("laureat.adminToken");
    } catch {}
    window.location.href = "/onboarding";
  };

  const handleVersionTap = () => {
    const next = versionTaps + 1;
    setVersionTaps(next);
    if (next >= 5) { setShowDebug(true); setVersionTaps(0); }
  };

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.id === preferences?.language) || LANGUAGE_OPTIONS[0];
  const currentPersonality = PERSONALITIES.find((p) => p.id === preferences?.personality) || PERSONALITIES[0];

  return (
    <div className="pb-28">
      <header className="bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 px-6 pt-6 pb-12 rounded-b-3xl text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute bottom-0 -left-10 w-32 h-32 rounded-full bg-violet-400/30 blur-3xl" />

        <div className="relative flex flex-col items-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/40 mb-4">
            <span className="text-4xl font-black text-white">{(preferences?.name || "U").charAt(0).toUpperCase()}</span>
          </motion.div>

          {editingName ? (
            <div className="flex items-center gap-2">
              <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()} autoFocus
                className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <button onClick={saveName} className="p-1.5 rounded-lg bg-emerald-500"><Check size={16} /></button>
              <button onClick={() => { setEditingName(false); setNameInput(preferences?.name || ""); }} className="p-1.5 rounded-lg bg-red-500"><X size={16} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">{preferences?.name || "Élève"}</h1>
              <button onClick={() => setEditingName(true)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"><Edit2 size={14} /></button>
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full ring-1 ring-white/20 font-semibold">
              {track === "9AF" ? "9ème AF" : "Nouveau Secondaire IV"}
            </span>
            <PlanBadge planTier={planTier} />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-4 -mt-4 relative z-10">
        <Section icon={<Sparkles size={18} className="text-violet-600" />} title="Personnalité du prof">
          <button onClick={() => setShowPersonalityPicker(!showPersonalityPicker)}
            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center gap-3 text-left">
            <span className="text-2xl">{currentPersonality.icon}</span>
            <div className="flex-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white">{currentPersonality.name}</div>
              <div className="text-xs text-slate-500">{currentPersonality.description}</div>
            </div>
            <Edit2 size={14} className="text-slate-400" />
          </button>
          {showPersonalityPicker && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 space-y-2">
              {PERSONALITIES.map((p) => (
                <button key={p.id} onClick={() => changePersonality(p.id)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 text-left ${preferences?.personality === p.id ? "bg-violet-100 dark:bg-violet-950/40 ring-2 ring-violet-500" : "bg-white dark:bg-slate-800"}`}>
                  <span className="text-xl">{p.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-[11px] text-slate-500">{p.description}</div>
                  </div>
                  {preferences?.personality === p.id && <Check size={16} className="text-violet-600" />}
                </button>
              ))}
            </motion.div>
          )}
        </Section>

        <Section icon={<span className="text-lg">🗣️</span>} title="Langue de discussion">
          <button onClick={() => setShowLangPicker(!showLangPicker)}
            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center gap-3 text-left">
            <span className="text-2xl">{currentLang.icon}</span>
            <div className="flex-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white">{currentLang.name}</div>
              <div className="text-xs text-slate-500">{currentLang.description}</div>
            </div>
            <Edit2 size={14} className="text-slate-400" />
          </button>
          {showLangPicker && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 space-y-2">
              {LANGUAGE_OPTIONS.map((l) => (
                <button key={l.id} onClick={() => changeLanguage(l.id)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 text-left ${preferences?.language === l.id ? "bg-violet-100 dark:bg-violet-950/40 ring-2 ring-violet-500" : "bg-white dark:bg-slate-800"}`}>
                  <span className="text-xl">{l.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">{l.name}</div>
                    <div className="text-[11px] text-slate-500">{l.description}</div>
                  </div>
                  {preferences?.language === l.id && <Check size={16} className="text-violet-600" />}
                </button>
              ))}
            </motion.div>
          )}
        </Section>

        <Section icon={<Crown size={18} className="text-amber-500" />} title="Plan d'abonnement">
          {planTier === "free" ? (
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate("/paywall")}
              className="w-full p-4 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30 flex items-center gap-3">
              <Crown size={24} />
              <div className="flex-1 text-left">
                <div className="font-bold">Passer en Premium</div>
                <div className="text-xs opacity-90">Scans, chats, voix HD illimités</div>
              </div>
            </motion.button>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center gap-3">
              <Check size={20} />
              <div className="flex-1">
                <div className="font-bold capitalize">Plan {planTier} actif</div>
                <div className="text-xs opacity-90">Tu profites de tous les avantages</div>
              </div>
            </div>
          )}
        </Section>

        <Section icon={<Settings size={18} className="text-slate-600" />} title="Paramètres">
          <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
            <button onClick={toggleTheme} className="w-full p-4 flex items-center gap-3 text-left">
              {theme === "dark" ? <Moon size={18} className="text-violet-500" /> : <Sun size={18} className="text-amber-500" />}
              <div className="flex-1">
                <div className="font-semibold text-sm text-slate-900 dark:text-white">Thème {theme === "dark" ? "sombre" : "clair"}</div>
                <div className="text-[11px] text-slate-500">Toucher pour basculer</div>
              </div>
            </button>
            <button onClick={() => setShowResetConfirm(true)} className="w-full p-4 flex items-center gap-3 text-left text-red-600 dark:text-red-400">
              <RotateCcw size={18} />
              <div className="flex-1">
                <div className="font-semibold text-sm">Réinitialiser tout</div>
                <div className="text-[11px] opacity-75">Recommencer depuis zéro</div>
              </div>
            </button>
          </div>
        </Section>

        {/* À propos — VERSION DISPLAY */}
        <Section icon={<Info size={18} className="text-slate-500" />} title="À propos">
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 text-center shadow-sm">
            <div className="font-black text-slate-900 dark:text-white mb-1">
              Laureat <span className="text-violet-600 dark:text-violet-400">AI</span>
            </div>
            <button onClick={handleVersionTap} className="text-xs text-slate-500 dark:text-slate-400">
              Version {APP_VERSION}
            </button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Ton professeur ayisyen virtuèl pou domine egzamen MENFP.
            </p>

            {showDebug && (
              <div className="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-left text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div><b>Build:</b> {BUILD_DATE}</div>
                <div><b>Notes:</b> {BUILD_NOTES}</div>
                <a href="/api/diag" target="_blank" rel="noreferrer" className="block text-violet-500 underline mt-1">
                  Ouvri dyagnostik odyo (/api/diag)
                </a>
                <button onClick={() => setShowDebug(false)} className="text-slate-400 mt-1">Fèmen</button>
              </div>
            )}
          </div>
        </Section>
      </main>

      {showResetConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-4" onClick={() => setShowResetConfirm(false)}>
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Tout effacer ?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              Cela supprime ton profil, tes sessions de classe et ton plan. Tu repars de zéro.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold">Annuler</button>
              <button onClick={resetEverything} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold">Effacer</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PlanBadge({ planTier }) {
  if (planTier === "premium") {
    return (
      <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-amber-900 px-3 py-1 rounded-full ring-1 ring-amber-300 font-bold flex items-center gap-1">
        <Crown size={11} />Premium
      </span>
    );
  }
  if (planTier === "basic") {
    return (
      <span className="text-xs bg-gradient-to-r from-blue-400 to-cyan-500 text-blue-900 px-3 py-1 rounded-full ring-1 ring-blue-300 font-bold flex items-center gap-1">
        <Zap size={11} />Basic
      </span>
    );
  }
  return (
    <span className="text-xs bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full ring-1 ring-white/20 font-semibold text-white/80">
      Gratuit
    </span>
  );
}
