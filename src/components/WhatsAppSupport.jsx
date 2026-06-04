// src/components/WhatsAppSupport.jsx — v24
// Floating WhatsApp support button. Number comes from VITE_SUPPORT_WHATSAPP
// (env var, digits only with country code, e.g. 509XXXXXXXX). Hidden on
// fullscreen routes so it doesn't cover the camera/call.

import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

const HIDDEN = ["/scan", "/onboarding", "/paywall"];

export default function WhatsAppSupport() {
  const location = useLocation();
  const number = import.meta.env.VITE_SUPPORT_WHATSAPP;
  const hideForClass = location.pathname.startsWith("/classe") && location.search.includes("session=");
  if (!number) return null;
  if (HIDDEN.some((p) => location.pathname.startsWith(p)) || hideForClass) return null;

  const msg = encodeURIComponent("Bonjour ! J'ai besoin d'aide avec Laureat AI.");
  const href = `https://wa.me/${number}?text=${msg}`;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
      className="fixed right-4 bottom-24 z-30 w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg shadow-[#25D366]/30"
      aria-label="Support WhatsApp"
    >
      <MessageCircle size={22} className="text-white" fill="white" />
    </motion.a>
  );
}
