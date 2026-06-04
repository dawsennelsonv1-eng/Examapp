// src/components/NotificationsBell.jsx — v24
// Real notifications panel (replaces the dead bell). Shows admin-authored
// notifications from Supabase plus a live exam countdown. Built so we can push
// more notification kinds later (welcome, promo, exam, update).

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, GraduationCap, Sparkles, Info } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { useAppConfig } from "../hooks/useAppConfig";
import { supabase } from "../lib/supabase";

const KIND_ICON = { welcome: Sparkles, exam: GraduationCap, promo: Sparkles, update: Info, info: Info };

function daysUntil(date) {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function NotificationsBell() {
  const { track } = useApp();
  const { config } = useAppConfig();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !supabase) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(10);
        setItems(data || []);
      } catch { setItems([]); }
    })();
  }, [open]);

  // Live exam countdown as a synthetic, always-present notification.
  const examStart = track === "9AF" ? config.exam_9af_start : config.exam_ns4_start;
  const examRange = track === "9AF" ? config.exam_9af_range : config.exam_ns4_range;
  const d = daysUntil(examStart);
  const examNotif = d != null ? {
    id: "exam-countdown",
    kind: "exam",
    title: d > 0 ? `Plus que ${d} jour${d > 1 ? "s" : ""} avant l'examen` : "C'est le moment de l'examen !",
    body: examRange ? `Examen ${track || ""} · ${examRange}. Continue à réviser !` : "Continue à réviser !",
  } : null;

  const all = [examNotif, ...items.filter((n) => !n.track || n.track === track)].filter(Boolean);

  return (
    <div ref={wrapRef} className="relative">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/70"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-slate-300" />
        {all.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden z-50"
          >
            <div className="px-3 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-700 text-white flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest font-black">Notifications</span>
              <button onClick={() => setOpen(false)}><X size={15} /></button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {all.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">Rien de nouveau pour l'instant.</div>
              ) : (
                all.map((n) => {
                  const Icon = KIND_ICON[n.kind] || Info;
                  return (
                    <div key={n.id} className="flex gap-3 p-3 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon size={15} className="text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{n.title}</div>
                        {n.body && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.body}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
