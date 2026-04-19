// src/pages/Profile.jsx
// User profile: settings, streak stats, theme toggle, track change.

import { motion } from "framer-motion";
import { Moon, Sun, User, Flame, Trophy, BookOpen, LogOut, ChevronRight, Globe } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { useStreak } from "../hooks/useStreak";
import Logo from "../components/Logo";

export default function Profile() {
  const { theme, toggleTheme, track, setTrack, TRACKS } = useApp();
  const streak = useStreak();

  // Stats pulled from localStorage later — mocked for now
  const stats = {
    problemsSolved: parseInt(localStorage.getItem("laureat.problemsSolved") || "0", 10),
    quizzesCompleted: parseInt(localStorage.getItem("laureat.quizzesCompleted") || "0", 10),
  };

  const resetTrack = () => {
    if (confirm("Changer de parcours ? Tu devras choisir à nouveau.")) {
      setTrack(null);
    }
  };

  return (
    <div className="pb-28">
      {/* Profile header */}
      <section className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-6 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <div>
            <div className="text-xl font-bold">Mon profil</div>
            <div className="text-sm text-white/80">
              Parcours : <span className="font-semibold">{track || "—"}</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats row */}
      <section className="px-4 -mt-6 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Flame} value={streak} label="Jours" color="orange" />
          <StatCard icon={Trophy} value={stats.problemsSolved} label="Résolus" color="amber" />
          <StatCard icon={BookOpen} value={stats.quizzesCompleted} label="Quiz" color="emerald" />
        </div>
      </section>

      {/* Settings */}
      <section className="px-4 space-y-3">
        <SectionTitle>Paramètres</SectionTitle>

        <div className="rounded-2xl bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          <SettingRow
            icon={theme === "dark" ? Moon : Sun}
            label={theme === "dark" ? "Mode sombre" : "Mode clair"}
            sublabel={theme === "dark" ? "Repose les yeux le soir" : "Plus lumineux le jour"}
            right={
              <ToggleSwitch value={theme === "dark"} onChange={toggleTheme} />
            }
          />
          <SettingRow
            icon={Globe}
            label="Langue"
            sublabel="Français (Kreyòl bientôt)"
            right={<span className="text-sm text-slate-400">FR</span>}
          />
          <SettingRow
            icon={User}
            label="Changer de parcours"
            sublabel="9AF / NS4"
            onClick={resetTrack}
            right={<ChevronRight size={18} className="text-slate-400" />}
          />
        </div>

        <SectionTitle>À propos</SectionTitle>

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 text-center">
          <Logo size={28} className="justify-center mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Version 0.2.0 — MVP
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ton professeur ayisyen virtuel pour conquérir le MENFP.
          </p>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color }) {
  const colors = {
    orange: "text-orange-500 bg-orange-100 dark:bg-orange-500/10",
    amber: "text-amber-500 bg-amber-100 dark:bg-amber-500/10",
    emerald: "text-emerald-500 bg-emerald-100 dark:bg-emerald-500/10",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm"
    >
      <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </motion.div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 pt-2">
      {children}
    </h2>
  );
}

function SettingRow({ icon: Icon, label, sublabel, right, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-sm text-slate-900 dark:text-white">{label}</div>
        {sublabel && (
          <div className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</div>
        )}
      </div>
      {right}
    </button>
  );
}

function ToggleSwitch({ value, onChange }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        value ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <motion.span
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
      />
    </button>
  );
}
