// src/components/BottomTabBar.jsx
// Premium tab bar with a prominent elevated center scan button.
// Uses Lucide icons for a clean, professional look.

import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, BookOpen, Archive, Layers, ScanLine } from "lucide-react";

export default function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const leftTabs = [
    { to: "/",       icon: Home,     label: "Akèy" },
    { to: "/quiz",   icon: BookOpen, label: "Kwiz" },
  ];

  const rightTabs = [
    { to: "/vault",    icon: Archive, label: "Achiv" },
    { to: "/subjects", icon: Layers,  label: "Matyè" },
  ];

  const isScanActive = location.pathname === "/scan";

  return (
    <>
      {/* Spacer so content isn't hidden behind the bar */}
      <div className="h-20" />

      <nav className="fixed bottom-0 left-0 right-0 z-30">
        {/* Curved cutout background */}
        <div className="relative">
          {/* White bar */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]" />

          {/* Tab content */}
          <div className="relative flex items-end justify-between max-w-md mx-auto px-2 pb-3 pt-2">
            {/* Left tabs */}
            <div className="flex flex-1 justify-around">
              {leftTabs.map((tab) => (
                <TabItem key={tab.to} {...tab} />
              ))}
            </div>

            {/* Center scan button — elevated, square, purple */}
            <div className="relative flex-shrink-0 mx-1">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => navigate("/scan")}
                className={`
                  relative -mt-8 w-20 h-20 rounded-3xl
                  bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700
                  shadow-xl shadow-violet-500/50
                  flex flex-col items-center justify-center
                  ring-4 ring-white dark:ring-slate-900
                  ${isScanActive ? "ring-violet-300" : ""}
                `}
                aria-label="Scan"
              >
                {/* Subtle pulsing glow when inactive */}
                {!isScanActive && (
                  <motion.div
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-3xl bg-violet-400/30 blur-xl -z-10"
                  />
                )}
                <ScanLine size={28} className="text-white mb-0.5" strokeWidth={2.5} />
                <span className="text-[10px] font-bold text-white tracking-wide">SCAN</span>
              </motion.button>
            </div>

            {/* Right tabs */}
            <div className="flex flex-1 justify-around">
              {rightTabs.map((tab) => (
                <TabItem key={tab.to} {...tab} />
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

function TabItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-3 py-2 min-w-[56px] rounded-xl transition-colors ${
          isActive
            ? "text-violet-600 dark:text-violet-400"
            : "text-slate-400 dark:text-slate-500"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <motion.div
            animate={isActive ? { y: -2 } : { y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
          </motion.div>
          <span className={`text-[10px] font-semibold ${isActive ? "opacity-100" : "opacity-70"}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
