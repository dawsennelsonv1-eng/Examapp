// src/components/GroupJoinPopup.jsx
// First-open modal inviting the student to the WhatsApp community. Shows after the
// welcome tour, once per session, until they join. "Joined" is set when they tap a
// join button (or "J'ai déjà rejoint") — after that it never shows again.
// Reads the two class links from app_config (set in AdminConfig); renders nothing
// if none are set.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Users, Lightbulb, Bell, Gift } from "lucide-react";
import { useAppConfig } from "../hooks/useAppConfig";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { useEffectiveTrack } from "../hooks/useAdminAccess";

const JOINED_KEY = "laureat.groupJoined";
const SHOWN_KEY = "laureat.groupPromptShown"; // per session
const TOUR_KEY = "laureat.tourDone";

export default function GroupJoinPopup() {
  const { config } = useAppConfig();
  const { isAuthenticated } = useAuth();
  const { onboardingComplete } = useApp();
  const track = useEffectiveTrack();
  const [open, setOpen] = useState(false);

  const link9af = config?.group_9af || "";
  const linkNs4 = config?.group_ns4 || "";

  useEffect(() => {
    if (open) return;
    if (!isAuthenticated || !onboardingComplete) return;
    if (!link9af && !linkNs4) return;

    let tourDone = false, joined = false, shown = false;
    try { tourDone = localStorage.getItem(TOUR_KEY) === "1"; } catch {}
    try { joined = localStorage.getItem(JOINED_KEY) === "1"; } catch {}
    try { shown = sessionStorage.getItem(SHOWN_KEY) === "1"; } catch {}
    if (!tourDone || joined || shown) return;

    const t = setTimeout(() => {
      setOpen(true);
      try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch {}
    }, 900); // let the home settle after the tour
    return () => clearTimeout(t);
  }, [isAuthenticated, onboardingComplete, link9af, linkNs4, open]);

  const markJoined = () => { try { localStorage.setItem(JOINED_KEY, "1"); } catch {} };
  const join = (url) => { if (url) window.open(url, "_blank", "noopener,noreferrer"); markJoined(); setOpen(false); };
  const alreadyJoined = () => { markJoined(); setOpen(false); };

  const single = track === "9AF" ? link9af : track === "NS4" ? linkNs4 : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900"
          >
            <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-emerald-400/15 blur-3xl" />

            <button onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <X size={15} className="text-white/80" />
            </button>

            <div className="relative flex flex-col items-center text-center">
              <img src="/icon-512.png" alt="Laureat AI" className="w-16 h-16 rounded-2xl shadow-lg mb-3" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 mb-2">
                <Gift size={12} className="text-amber-300" />
                <span className="text-[11px] font-black tracking-wide text-amber-200">100% GRATUIT</span>
              </div>
              <h2 className="text-xl font-black leading-tight">Rejoins la communauté Laureat AI</h2>
              <p className="text-[13px] text-white/75 mt-1.5">Le groupe WhatsApp des élèves qui préparent l'examen</p>
            </div>

            <div className="relative space-y-2.5 my-5">
              <Benefit icon={Users} text="Échange avec d'autres élèves de ta classe" />
              <Benefit icon={Lightbulb} text="Demande les fonctionnalités que tu veux voir" />
              <Benefit icon={Bell} text="Reçois annonces, astuces et rappels d'examen" />
            </div>

            {single ? (
              <Join onClick={() => join(single)} label="Rejoindre le groupe" />
            ) : (
              <div className="relative grid grid-cols-2 gap-2">
                {link9af && <Join onClick={() => join(link9af)} label="Groupe 9AF" small />}
                {linkNs4 && <Join onClick={() => join(linkNs4)} label="Groupe NS4" small />}
              </div>
            )}

            <button onClick={alreadyJoined}
              className="relative w-full mt-3 text-center text-[12px] text-white/60 underline">
              J'ai déjà rejoint
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Benefit({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
        <Icon size={15} />
      </div>
      <span className="text-[13px] text-white/90 leading-snug text-left">{text}</span>
    </div>
  );
}

function Join({ onClick, label, small }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}
      className={`relative w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-emerald-700 font-black shadow-lg ${small ? "px-3 py-3 text-xs" : "px-4 py-4 text-sm"}`}>
      <MessageCircle size={small ? 16 : 18} />
      {label}
    </motion.button>
  );
}
