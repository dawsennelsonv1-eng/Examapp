// src/components/TopBar.jsx — v24
// Logo + "Laureat AI / EXAMEN PREP" on the left.
// Admin switcher + Notifications bell + Profile circle on the right.
// (Dead streak button removed; bell is now a real notifications panel.)

import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../contexts/AppContext";
import PlanSwitcher from "./admin/PlanSwitcher";
import NotificationsBell from "./NotificationsBell";

const HIDDEN_ROUTES = ["/scan", "/admin", "/onboarding", "/paywall"];

export default function TopBar({ streak = 3 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences } = useApp() || {};

  // Hide on fullscreen routes
  const hideForRoute = HIDDEN_ROUTES.some((p) => location.pathname.startsWith(p));
  const hideForClassSession =
    location.pathname.startsWith("/classe") && location.search.includes("session=");

  if (hideForRoute || hideForClassSession) return null;

  const initial = (preferences?.name || "U").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 bg-slate-950 border-b border-slate-800/60 px-4 py-3">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {/* Left: Logo + name */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-violet-500/30">
              L
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-950" />
          </div>
          <div className="text-left">
            <div className="font-black text-white text-base leading-tight">
              Laureat <span className="text-violet-400">AI</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              EXAMEN PREP
            </div>
          </div>
        </button>

        {/* Right: admin + notifications + profile */}
        <div className="flex items-center gap-1.5">
          {/* Admin badge — invisible unless admin */}
          <PlanSwitcher />

          {/* Notifications (real panel: welcome + exam countdown + admin messages) */}
          <NotificationsBell />

          {/* Profile circle */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-md"
            aria-label="Profil"
          >
            {initial}
          </motion.button>
        </div>
      </div>
    </header>
  );
}
