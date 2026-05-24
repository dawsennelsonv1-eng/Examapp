// src/components/Layout.jsx
// Main app shell: top header, page content, bottom tab bar.

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, Brain, Camera, GraduationCap, BookOpen,
  Bell, User, Flame,
} from "lucide-react";
import { useEffect } from "react";
import { useApp } from "../contexts/AppContext";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { track } = useApp();

  // Redirect to onboarding if no track set
  useEffect(() => {
    if (!track && location.pathname !== "/onboarding") {
      navigate("/onboarding");
    }
  }, [track, location.pathname, navigate]);

  // Don't show layout chrome on scan or classroom session pages
  const hideChrome = location.pathname === "/scan";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {!hideChrome && <TopHeader />}
      <main className="pb-24">
        <Outlet />
      </main>
      {!hideChrome && <BottomTabBar />}
    </div>
  );
}

function TopHeader() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
      <Logo />
      <div className="flex-1" />
      <button className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-400 relative">
        <Flame size={18} fill="currentColor" />
      </button>
      <button className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
        <Bell size={18} />
      </button>
      <button
        onClick={() => navigate("/profile")}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center text-white shadow-md"
      >
        <User size={18} />
      </button>
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

function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: "/", icon: Home, label: "Accueil" },
    { path: "/quiz", icon: Brain, label: "Quiz" },
    { path: "/scan", icon: Camera, label: "Scan", isCenter: true },
    { path: "/classe", icon: GraduationCap, label: "Classe" },
    { path: "/reviser", icon: BookOpen, label: "Réviser" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-end justify-around px-2 py-2 pb-3 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <motion.button
                key={tab.path}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(tab.path)}
                className="relative -mt-6"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-violet-500/40 ring-4 ring-white dark:ring-slate-950">
                  <Icon size={26} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="text-[10px] font-bold text-violet-600 dark:text-violet-400 mt-1 text-center">
                  {tab.label}
                </div>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={tab.path}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[60px]"
            >
              <Icon
                size={20}
                className={
                  isActive
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-slate-400 dark:text-slate-500"
                }
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-semibold ${
                  isActive
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
