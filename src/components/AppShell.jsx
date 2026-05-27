// src/components/AppShell.jsx
// FINAL: mounts FirstLaunchTutorial after onboarding.

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Flame } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import BottomTabBar from "./BottomTabBar";
import FirstLaunchTutorial from "./shared/FirstLaunchTutorial";

export default function AppShell() {
  const location = useLocation();
  const hideChrome = location.pathname === "/scan";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {!hideChrome && <TopHeader />}
      <main className="pb-24">
        <Outlet />
      </main>
      {!hideChrome && <BottomTabBar />}
      <FirstLaunchTutorial />
    </div>
  );
}

function TopHeader() {
  const navigate = useNavigate();
  const { preferences } = useApp();
  const initial = preferences?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
      <Logo />
      <div className="flex-1" />
      <button className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
        <Flame size={18} fill="currentColor" />
      </button>
      <button className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
        <Bell size={18} />
      </button>
      <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate("/profile")}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center text-white shadow-md font-bold text-sm">
        {initial}
      </motion.button>
    </header>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 flex items-center justify-center shadow-md">
        <span className="text-white font-black text-lg">L</span>
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm border-2 border-white dark:border-slate-950" />
      </div>
      <div className="leading-tight">
        <div className="font-black text-sm text-slate-900 dark:text-white">
          Laureat <span className="text-violet-600 dark:text-violet-400">AI</span>
        </div>
        <div className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
          MENFP Prep
        </div>
      </div>
    </div>
  );
}
