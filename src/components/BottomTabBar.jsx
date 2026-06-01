// src/components/BottomTabBar.jsx — v23
// Matches your v18 screenshot exactly:
//  - 5 slots: Accueil · Réviser · SCAN (FAB with label inside) · Classe · Cours
//  - SCAN button has "SCAN" text below the icon, inside the FAB
//  - Other tabs: icon top, label below (small)
//  - Active tab: violet color
//  - Inactive: slate-500

import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home as HomeIcon, GraduationCap, MessageSquare,
  BookOpen, Scan,
} from "lucide-react";

const TABS = [
  { id: "home",    path: "/",        label: "Accueil", icon: HomeIcon },
  { id: "reviser", path: "/reviser", label: "Réviser", icon: GraduationCap },
  { id: "scan",    path: "/scan",    label: "SCAN",    icon: Scan, isFAB: true },
  { id: "classe",  path: "/classe",  label: "Classe",  icon: MessageSquare },
  { id: "cours",   path: "/cours",   label: "Cours",   icon: BookOpen },
];

export default function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/60 px-2 pt-1.5 pb-safe">
      <div className="flex items-end justify-around max-w-md mx-auto relative">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          if (tab.isFAB) {
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => navigate(tab.path)}
                className="relative -mt-5"
                aria-label="Scanner"
              >
                <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-violet-500 to-indigo-700 flex flex-col items-center justify-center shadow-lg shadow-violet-500/40 ring-4 ring-slate-950">
                  <Icon size={22} className="text-white" strokeWidth={2.5} />
                  <span className="text-[9px] font-black tracking-widest text-white mt-0.5">SCAN</span>
                </div>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-0.5 pt-1.5 pb-2 px-2 flex-1"
            >
              <Icon size={22} strokeWidth={2} className={active ? "text-violet-400" : "text-slate-500"} />
              <span className={`text-[10px] font-bold ${active ? "text-violet-400" : "text-slate-500"}`}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
