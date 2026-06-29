// src/components/AskToPay.jsx
// "Get someone else to pay for you." Most students are convinced but broke — the
// money is one WhatsApp message away (a parent, or family in the diaspora). This
// turns the student into the salesperson: one tap opens WhatsApp with a ready-made
// message (in Kreyòl) they send to whoever can pay. Two flavors: parent / diaspora.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HandHeart, X, MessageCircle, Users, Globe } from "lucide-react";
import { WHATSAPP_NUMBER } from "../utils/constants";

const digits = (s) => (s || "").replace(/[^0-9]/g, "");
const SUPPORT = digits(import.meta.env.VITE_WHATSAPP_NUMBER || WHATSAPP_NUMBER);
const MONCASH = digits(import.meta.env.VITE_MONCASH_NUMBER);
const NATCASH = digits(import.meta.env.VITE_NATCASH_NUMBER);

function payLines() {
  const wa = SUPPORT ? `WhatsApp: +${SUPPORT}` : "WhatsApp nou an";
  if (MONCASH || NATCASH) {
    const mc = MONCASH ? `MonCash: ${MONCASH}` : "";
    const nc = NATCASH ? `NatCash: ${NATCASH}` : "";
    const both = [mc, nc].filter(Boolean).join(" — oswa ");
    return `1️⃣ Voye lajan an sou ${both}\n2️⃣ Voye prèv peman an sou ${wa}`;
  }
  return `Voye nou yon mesaj sou ${wa} epi n ap ba w tout enstriksyon pou peye a.`;
}

function parentMessage(price) {
  return (
    `Bonjou 🙏 M ap prepare egzamen ofisyèl mwen ak Laureat AI, yon app ki ede m ` +
    `konprann tout egzèsis yo etap pa etap epi reyisi.\n\n` +
    `Pou m gen aksè konplè jiska egzamen an, li koute ${price} goud — yon sèl fwa ` +
    `(se pa chak mwa). Èske w ka ede m peye l?\n\n` +
    `${payLines()}\n\n` +
    `Mèsi anpil, sa ap ede m anpil pou egzamen an ❤️`
  );
}

function diasporaMessage(price) {
  const usd = Math.max(1, Math.round(price / 138));
  return (
    `Bonjou 🙏 M ap prepare egzamen ofisyèl mwen (9AF/NS4) ak Laureat AI, yon app ` +
    `entelijans atifisyèl ki ede m etidye pou m reyisi.\n\n` +
    `Pou m gen tout sa m bezwen jiska egzamen an, li koute ${price} goud sèlman — ` +
    `sa fè anviwon ${usd}$ US. Èske w ka ede m? Sa ap chanje anpil bagay pou mwen.\n\n` +
    `${payLines()}\n\n` +
    `Mèsi anpil, m p ap janm bliye sa ❤️`
  );
}

function openWhatsApp(text) {
  // No number → WhatsApp opens the contact picker so they choose mom / cousin / etc.
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function AskToPay({ price = 900, className = "", variant = "solid" }) {
  const [open, setOpen] = useState(false);

  const trigger =
    variant === "link" ? (
      <button onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-sm font-bold text-emerald-300 underline underline-offset-2 ${className}`}>
        <HandHeart size={15} /> Demande à quelqu'un de payer pour toi
      </button>
    ) : (
      <button onClick={() => setOpen(true)}
        className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-black text-white bg-gradient-to-br from-emerald-600 to-teal-700 shadow-lg ${className}`}>
        <HandHeart size={18} /> Demande à quelqu'un de payer pour toi
      </button>
    );

  return (
    <>
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl p-6 bg-slate-900 ring-1 ring-white/10 text-white"
            >
              <button onClick={() => setOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <X size={15} className="text-white/70" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-3">
                <HandHeart size={24} className="text-emerald-300" />
              </div>
              <h2 className="text-lg font-black leading-tight">Pa gen kòb kounye a? Pa pwoblèm.</h2>
              <p className="text-[13px] text-white/65 mt-1.5 leading-relaxed">
                Voye yon mesaj tou prè bay yon moun ki ka ede w peye. Nou deja ekri l pou ou —
                ou jis chwazi moun nan sou WhatsApp.
              </p>

              <div className="mt-5 space-y-2.5">
                <button onClick={() => { openWhatsApp(parentMessage(price)); setOpen(false); }}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 text-left">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-emerald-300" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-sm">Yon paran</div>
                    <div className="text-[11px] text-white/55">Manman, papa, matant, parenn…</div>
                  </div>
                  <MessageCircle size={18} className="text-emerald-400" />
                </button>

                <button onClick={() => { openWhatsApp(diasporaMessage(price)); setOpen(false); }}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 text-left">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                    <Globe size={18} className="text-sky-300" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-sm">Fanmi nan dyaspora</div>
                    <div className="text-[11px] text-white/55">Yon moun nan etranje ki ka ede</div>
                  </div>
                  <MessageCircle size={18} className="text-emerald-400" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
