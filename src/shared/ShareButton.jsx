// src/components/shared/ShareButton.jsx
// v17: Direct WhatsApp share with prewritten message + app link. Falls back to native share or copy.

import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Check } from "lucide-react";

const APP_URL = "https://examapp-virid.vercel.app";

export default function ShareButton({ type = "scan_result", payload = {}, label, compact = false }) {
  const [copied, setCopied] = useState(false);

  const buildMessage = () => {
    if (type === "scan_result") {
      const excerpt = payload?.enonce
        ? `"${String(payload.enonce).substring(0, 120)}..."`
        : "un exercice";
      return `📚 Yon zanmi pataje yon egzèsis sou Laureat AI:\n\n${excerpt}\n\n🎯 Pwofesè AI a ka eksplike w step-by-step.\nEseye li gratis: ${APP_URL}`;
    }
    if (type === "session") {
      return `📚 Gade konvèsasyon mwen ak pwofesè AI a sou Laureat:\n\n${APP_URL}`;
    }
    return `📚 Eseye Laureat AI — pwofesè entelijan pou prepare egzamen MENFP:\n\n${APP_URL}`;
  };

  const handleShare = async () => {
    const message = buildMessage();

    // Try native Web Share first (best on mobile — pulls up the OS share sheet)
    if (navigator.share) {
      try {
        await navigator.share({ text: message, url: APP_URL });
        return;
      } catch {
        // user cancelled — fall through
      }
    }

    // WhatsApp direct deep link
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");

    // Also copy to clipboard as backup
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (compact) {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleShare}
        className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300"
        title="Partager"
      >
        {copied ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-md"
    >
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {label || (copied ? "Copié!" : "Partager")}
    </motion.button>
  );
}
