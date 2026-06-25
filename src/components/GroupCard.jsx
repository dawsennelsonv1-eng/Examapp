// src/components/GroupCard.jsx
// Branded "join the WhatsApp community" card. Reads the two class group links from
// app_config (set in AdminConfig). Renders nothing until at least one link exists.
//
// Usage:
//   <GroupCard track={track} />   // track known (Home) → one button to that class
//   <GroupCard />                 // track unknown (signup) → one button per class

import { motion } from "framer-motion";
import { MessageCircle, Users, Lightbulb, Bell } from "lucide-react";
import { useAppConfig } from "../hooks/useAppConfig";

export default function GroupCard({ track, className = "" }) {
  const { config } = useAppConfig();
  const link9af = config?.group_9af || "";
  const linkNs4 = config?.group_ns4 || "";
  if (!link9af && !linkNs4) return null; // nothing set yet → don't show a dead card

  const open = (url) => { if (url) window.open(url, "_blank", "noopener,noreferrer"); };
  const single = track === "9AF" ? link9af : track === "NS4" ? linkNs4 : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-5 text-white shadow-xl relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 ${className}`}
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald-400/15 blur-3xl" />

      <div className="relative flex items-center gap-3 mb-3">
        <img src="/icon-512.png" alt="Laureat AI" className="w-11 h-11 rounded-xl shadow-md" />
        <div>
          <div className="text-base font-black leading-tight">Communauté Laureat AI</div>
          <div className="text-[11px] text-white/75">Rejoins le groupe WhatsApp de ta classe</div>
        </div>
      </div>

      <div className="relative space-y-2 mb-4">
        <Benefit icon={Users} text="Échange avec d'autres élèves de ta classe" />
        <Benefit icon={Lightbulb} text="Demande de nouvelles fonctionnalités" />
        <Benefit icon={Bell} text="Reçois les annonces et astuces pour l'examen" />
      </div>

      {single ? (
        <JoinButton onClick={() => open(single)} label="Rejoindre le groupe" />
      ) : (
        <div className="relative grid grid-cols-2 gap-2">
          {link9af && <JoinButton onClick={() => open(link9af)} label="Groupe 9AF" small />}
          {linkNs4 && <JoinButton onClick={() => open(linkNs4)} label="Groupe NS4" small />}
        </div>
      )}
    </motion.div>
  );
}

function Benefit({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
        <Icon size={14} />
      </div>
      <span className="text-[13px] text-white/90 leading-snug">{text}</span>
    </div>
  );
}

function JoinButton({ onClick, label, small }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-emerald-700 font-bold shadow-lg ${small ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"}`}
    >
      <MessageCircle size={small ? 15 : 17} />
      {label}
    </motion.button>
  );
}
