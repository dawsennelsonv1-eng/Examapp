// src/components/shared/ShareButton.jsx
// Creates a share link and triggers native share sheet / copies to clipboard.

import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Copy, Check, Loader2 } from "lucide-react";

export default function ShareButton({ type, payload, label = "Partager", compact = false }) {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
      });
      const data = await response.json();
      if (!data?.data?.shareId) throw new Error("Failed");

      const url = `${window.location.origin}/share/${data.data.shareId}`;
      const text = type === "scan_result"
        ? "Gade kijan Laureat AI rezoud egzèsis sa a 🎯"
        : "Gade konvèsasyon mwen ak Pwofesè AI 💬";

      if (navigator.share) {
        try {
          await navigator.share({ title: "Laureat AI", text, url });
        } catch (err) {
          if (err.name !== "AbortError") {
            await copyToClipboard(url);
          }
        }
      } else {
        await copyToClipboard(url);
      }
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setSharing(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copie ce lien:", text);
    }
  };

  if (compact) {
    return (
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={handleShare}
        disabled={sharing}
        className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 disabled:opacity-50"
        title="Partager"
      >
        {sharing ? <Loader2 size={16} className="animate-spin" /> :
         copied ? <Check size={16} className="text-emerald-500" /> :
         <Share2 size={16} />}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleShare}
      disabled={sharing}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold text-sm shadow-md disabled:opacity-50"
    >
      {sharing ? <Loader2 size={16} className="animate-spin" /> :
       copied ? <Check size={16} /> :
       <Share2 size={16} />}
      {sharing ? "Création..." : copied ? "Copié !" : label}
    </motion.button>
  );
}
