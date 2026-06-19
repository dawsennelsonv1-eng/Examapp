// src/components/admin/PlanSwitcher.jsx v22
// Header dropdown shown ONLY when the user is admin (useAdminAccess).
// Lets you preview the app as Free / Basic / Premium, plus jump to the dashboard.

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Eye, ChevronDown, User, Zap, BarChart3, Check, Settings, GraduationCap, FileText,
} from "lucide-react";
import { useAdminAccess } from "../../hooks/useAdminAccess";

const PLAN_OPTIONS = [
  { id: null,        label: "Vue admin réelle",   sublabel: "Voir ton vrai plan",  icon: Crown,  color: "from-amber-500 to-orange-600" },
  { id: "free",      label: "Aperçu Gratuit",      sublabel: "Voir comme un free",   icon: User,   color: "from-slate-400 to-slate-600" },
  { id: "basic",     label: "Aperçu Basic",        sublabel: "Limité",               icon: Zap,    color: "from-blue-500 to-cyan-600" },
  { id: "premium",   label: "Aperçu Premium",      sublabel: "Illimité",             icon: Crown,  color: "from-amber-500 to-orange-600" },
];

const TRACK_OPTIONS = [
  { id: null,  label: "Niveau réel" },
  { id: "9AF", label: "Aperçu 9ème AF" },
  { id: "NS4", label: "Aperçu NS4" },
];

export default function PlanSwitcher() {
  const navigate = useNavigate();
  const { isAdmin, viewAsPlan, setViewAsPlan, viewAsTrack, setViewAsTrack } = useAdminAccess();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!isAdmin) return null;

  const current = PLAN_OPTIONS.find((p) => p.id === viewAsPlan) || PLAN_OPTIONS[0];
  const CurrentIcon = current.icon;

  return (
    <div ref={wrapRef} className="relative">
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full text-xs font-bold ring-1 transition-colors ${
          viewAsPlan
            ? "bg-gradient-to-r from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/40 ring-violet-300 dark:ring-violet-700 text-violet-700 dark:text-violet-300"
            : "bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 ring-amber-300 dark:ring-amber-700 text-amber-700 dark:text-amber-300"
        }`}
        title="Mode admin"
      >
        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${current.color} flex items-center justify-center text-white`}>
          <CurrentIcon size={10} />
        </div>
        <span className="hidden sm:inline">{viewAsPlan ? "Aperçu" : "Admin"}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed left-3 right-3 top-16 max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 z-50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 sm:max-h-none sm:overflow-hidden"
          >
            {/* Header strip */}
            <div className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              <div className="flex items-center gap-1.5">
                <Crown size={12} />
                <span className="text-[10px] uppercase tracking-widest font-black">Mode administrateur</span>
              </div>
            </div>

            {/* Dashboard link */}
            <button
              onClick={() => { setOpen(false); navigate("/admin"); }}
              className="w-full p-3 flex items-center gap-3 text-left hover:bg-violet-50 dark:hover:bg-violet-950/30 border-b border-slate-100 dark:border-slate-700"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center text-white shadow-sm">
                <BarChart3 size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-white">Dashboard Admin</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Métriques + KPIs</div>
              </div>
            </button>

            {/* Config link */}
            <button
              onClick={() => { setOpen(false); navigate("/admin/config"); }}
              className="w-full p-3 flex items-center gap-3 text-left hover:bg-violet-50 dark:hover:bg-violet-950/30 border-b border-slate-100 dark:border-slate-700"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-sm">
                <Settings size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-white">Configuration</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Prix, dates, fonctionnalités</div>
              </div>
            </button>

            {/* Exams link */}
            <button
              onClick={() => { setOpen(false); navigate("/admin/exams"); }}
              className="w-full p-3 flex items-center gap-3 text-left hover:bg-violet-50 dark:hover:bg-violet-950/30 border-b border-slate-100 dark:border-slate-700"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-sm">
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-white">Examens (PDF)</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Téléverser les examens passés</div>
              </div>
            </button>

            {/* Plan preview options */}
            <div className="py-1">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Eye size={10} />
                Prévisualiser comme
              </div>
              {PLAN_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = opt.id === viewAsPlan;
                return (
                  <button
                    key={opt.id || "real"}
                    onClick={() => { setViewAsPlan(opt.id); setOpen(false); }}
                    className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 ${active ? "bg-violet-50 dark:bg-violet-950/30" : ""}`}
                  >
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${opt.color} flex items-center justify-center text-white flex-shrink-0`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-xs ${active ? "text-violet-700 dark:text-violet-300" : "text-slate-900 dark:text-white"}`}>
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{opt.sublabel}</div>
                    </div>
                    {active && <Check size={13} className="text-violet-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Track preview options */}
            <div className="py-1 border-t border-slate-100 dark:border-slate-700">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <GraduationCap size={10} />
                Prévisualiser le niveau
              </div>
              {TRACK_OPTIONS.map((opt) => {
                const active = opt.id === viewAsTrack;
                return (
                  <button
                    key={opt.id || "real-track"}
                    onClick={() => { setViewAsTrack(opt.id); setOpen(false); }}
                    className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 ${active ? "bg-violet-50 dark:bg-violet-950/30" : ""}`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                      <GraduationCap size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-xs ${active ? "text-violet-700 dark:text-violet-300" : "text-slate-900 dark:text-white"}`}>
                        {opt.label}
                      </div>
                    </div>
                    {active && <Check size={13} className="text-violet-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {viewAsPlan && (
              <div className="px-3 py-2 bg-violet-50 dark:bg-violet-950/30 border-t border-slate-100 dark:border-slate-700">
                <p className="text-[10px] text-violet-700 dark:text-violet-300 leading-relaxed">
                  Tu vois l'app comme un utilisateur <b>{viewAsPlan}</b>. Les limites et locks sont appliqués.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
