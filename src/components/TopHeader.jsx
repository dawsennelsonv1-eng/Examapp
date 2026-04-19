// src/components/TopHeader.jsx
// Header with logo, streak, notification bell, and profile avatar.
// Profile avatar tap → navigates to /profile (full page, not in tab bar).

import { Bell, Flame, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useStreak } from "../hooks/useStreak";

export default function TopHeader() {
  const streak = useStreak();
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const notifications = [
    {
      id: 1,
      title: "Ta mission du jour t'attend 📚",
      body: "2 formules de physique à maîtriser aujourd'hui.",
      time: "il y a 2h",
      unread: true,
    },
    {
      id: 2,
      title: "Série en cours !",
      body: `${streak} jour${streak > 1 ? "s" : ""} — ne casse pas ta série ce soir.`,
      time: "hier",
      unread: false,
    },
  ];
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size={32} />

          <div className="flex items-center gap-2">
            {/* Streak */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30"
            >
              <Flame size={16} className="text-orange-500" fill="currentColor" />
              <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
                {streak}
              </span>
            </motion.div>

            {/* Bell */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Profile avatar */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate("/profile")}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center text-white shadow-sm"
              aria-label="Profil"
            >
              <User size={16} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Notifications panel */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotifOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 z-50 shadow-2xl overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 dark:text-white">Notifications</h2>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="text-slate-500 dark:text-slate-400 text-sm"
                >
                  Fermer
                </button>
              </div>
              <div className="p-3 space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl ${
                      n.unread
                        ? "bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-500/30"
                        : "bg-slate-50 dark:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {n.unread && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">
                          {n.title}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {n.body}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {n.time}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
