// src/components/AppShell.jsx v22
// Wraps all authenticated routes. Adds a top-right PlanSwitcher dropdown
// that only renders for admins (handled inside PlanSwitcher itself).

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import BottomTabBar from "./BottomTabBar";
import PlanSwitcher from "./admin/PlanSwitcher";

// Hide the global top bar inside fullscreen routes (camera, classroom session, quiz player)
const HIDE_TOPBAR_ON = ["/scan", "/classe"];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideTopBar = HIDE_TOPBAR_ON.some((p) => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {!hideTopBar && (
        <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-end gap-2 px-4 pt-3 pb-2 pointer-events-none">
          <div className="pointer-events-auto">
            <PlanSwitcher />
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate("/profile")}
            className="pointer-events-auto w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm"
          >
            <Settings size={16} />
          </motion.button>
        </header>
      )}

      <main className="relative">
        <Outlet />
      </main>

      <BottomTabBar />
    </div>
  );
}
