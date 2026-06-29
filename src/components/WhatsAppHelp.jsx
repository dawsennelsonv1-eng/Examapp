// src/components/WhatsAppHelp.jsx
// "Contactez-nous" — a WhatsApp-themed help button so users always have an obvious
// way to reach support (reduces silent drop-off when they're confused or stuck on
// payment). Two forms: `inline` (a button in a layout) and `floating` (a FAB that
// sits above the bottom nav on every screen). Pre-written help message is in Kreyòl.

import { MessageCircle } from "lucide-react";
import { WHATSAPP_NUMBER } from "../utils/constants";

const SUPPORT = (import.meta.env.VITE_WHATSAPP_NUMBER || WHATSAPP_NUMBER || "").replace(/[^0-9]/g, "");
const HELP_MESSAGE = "Bonjou 🙏 Mwen bezwen èd ak Laureat AI.";

function openHelp() {
  const text = encodeURIComponent(HELP_MESSAGE);
  const url = SUPPORT ? `https://wa.me/${SUPPORT}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function WhatsAppHelp({ variant = "inline", label = "Contactez-nous", className = "" }) {
  if (variant === "floating") {
    return (
      <button onClick={openHelp} aria-label="Contactez-nous sur WhatsApp"
        className={`fixed z-40 bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white ${className}`}
        style={{ backgroundColor: "#25D366" }}>
        <MessageCircle size={26} />
      </button>
    );
  }

  return (
    <button onClick={openHelp}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold text-white shadow ${className}`}
      style={{ backgroundColor: "#25D366" }}>
      <MessageCircle size={18} /> {label}
    </button>
  );
}
