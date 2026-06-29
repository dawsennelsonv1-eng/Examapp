// src/components/AskToPay.jsx
// "Get someone else to pay for you." Most students are convinced but broke — the
// money is one WhatsApp message away (a parent, or family in the diaspora). Two
// steps: pick who pays, then pick the message language (Français / Kreyòl). The
// message names the student so payments can be matched to their account.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HandHeart, X, MessageCircle, Users, Globe, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import { WHATSAPP_NUMBER } from "../utils/constants";

const digits = (s) => (s || "").replace(/[^0-9]/g, "");
const SUPPORT = digits(import.meta.env.VITE_WHATSAPP_NUMBER || WHATSAPP_NUMBER);
const MONCASH = digits(import.meta.env.VITE_MONCASH_NUMBER);
const NATCASH = digits(import.meta.env.VITE_NATCASH_NUMBER);

function payKr() {
  const wa = SUPPORT ? `WhatsApp: +${SUPPORT}` : "WhatsApp nou an";
  if (MONCASH || NATCASH) {
    const both = [MONCASH && `MonCash: ${MONCASH}`, NATCASH && `NatCash: ${NATCASH}`].filter(Boolean).join(" — oswa ");
    return `1️⃣ Voye lajan an sou ${both}\n2️⃣ Voye prèv la sou ${wa}`;
  }
  return `Voye nou yon mesaj sou ${wa} epi n ap ba w enstriksyon pou peye a.`;
}
function payFr() {
  const wa = SUPPORT ? `WhatsApp : +${SUPPORT}` : "notre WhatsApp";
  if (MONCASH || NATCASH) {
    const both = [MONCASH && `MonCash : ${MONCASH}`, NATCASH && `NatCash : ${NATCASH}`].filter(Boolean).join(" ou ");
    return `1️⃣ Envoie le montant sur ${both}\n2️⃣ Envoie la preuve sur ${wa}`;
  }
  return `Écris-nous sur ${wa} et on t'enverra les instructions de paiement.`;
}

function buildMessage({ who, lang, name, price }) {
  const usd = Math.max(1, Math.round(price / 138));
  if (lang === "fr") {
    if (who === "diaspora") {
      return `Bonjour 🙏 C'est ${name}. Je prépare mon examen officiel (9AF/NS4) avec Laureat AI, une app qui m'aide à étudier. Pour tout débloquer c'est ${price} HTG par mois — environ ${usd}$ US. Peux-tu m'aider ?\n\n${payFr()}\n\nAu moment de payer, dis simplement que c'est pour ${name} — on activera le compte tout de suite. Merci beaucoup ❤️`;
    }
    return `Bonjour 🙏 C'est ${name}. Je prépare mon examen avec Laureat AI, une app qui m'explique chaque exercice étape par étape. Pour avoir l'accès complet c'est ${price} HTG par mois. Peux-tu m'aider à payer ?\n\n${payFr()}\n\nAu moment de payer, dis que c'est pour ${name} — on activera le compte tout de suite. Merci beaucoup ❤️`;
  }
  // Kreyòl
  if (who === "diaspora") {
    return `Bonjou 🙏 Se ${name}. M ap prepare egzamen ofisyèl mwen (9AF/NS4) ak Laureat AI, yon app ki ede m etidye. Pou m gen tout sa m bezwen li koute ${price} goud pa mwa — sa fè anviwon ${usd}$ US. Èske w ka ede m?\n\n${payKr()}\n\nLè w fin peye, jis di se pou ${name} — n ap aktive kont lan touswit. Mèsi anpil, m p ap janm bliye sa ❤️`;
  }
  return `Bonjou 🙏 Se ${name}. M ap prepare egzamen mwen ak Laureat AI, yon app ki ede m konprann tout egzèsis yo etap pa etap. Pou m gen aksè konplè li koute ${price} goud pa mwa. Èske w ka ede m peye l?\n\n${payKr()}\n\nLè w fin peye, jis di se pou ${name} — n ap aktive kont lan touswit. Mèsi anpil ❤️`;
}

function openWhatsApp(text) {
  // No number → WhatsApp opens the contact picker so they choose mom / cousin / etc.
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

export default function AskToPay({ price = 900, className = "", variant = "solid" }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("who"); // "who" | "lang"
  const [who, setWho] = useState(null);     // "parent" | "diaspora"
  const [name, setName] = useState("Élève");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess?.session?.user;
        if (!user) return;
        let n = null;
        try {
          const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
          n = prof?.display_name || null;
        } catch {}
        if (!n) n = (user.email || "").split("@")[0] || "Élève";
        if (alive && n) setName(n);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  const reset = () => { setStep("who"); setWho(null); };
  const close = () => { setOpen(false); reset(); };

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

  const pick = (lang) => { openWhatsApp(buildMessage({ who, lang, name, price })); close(); };

  return (
    <>
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto p-4"
            onClick={close}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm my-auto rounded-3xl p-6 pb-8 bg-slate-900 ring-1 ring-white/10 text-white max-h-[88vh] overflow-y-auto"
            >
              <button onClick={close}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <X size={15} className="text-white/70" />
              </button>

              {step === "who" ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-3">
                    <HandHeart size={24} className="text-emerald-300" />
                  </div>
                  <h2 className="text-lg font-black leading-tight">Pa gen kòb kounye a? Pa pwoblèm.</h2>
                  <p className="text-[13px] text-white/65 mt-1.5 leading-relaxed">
                    Voye yon mesaj tou prè bay yon moun ki ka ede w peye. Ou jis chwazi moun nan sou WhatsApp.
                  </p>

                  <div className="mt-5 space-y-2.5">
                    <button onClick={() => { setWho("parent"); setStep("lang"); }}
                      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 text-left">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                        <Users size={18} className="text-emerald-300" />
                      </div>
                      <div className="flex-1">
                        <div className="font-black text-sm">Yon paran</div>
                        <div className="text-[11px] text-white/55">Manman, papa, matant, parenn…</div>
                      </div>
                    </button>

                    <button onClick={() => { setWho("diaspora"); setStep("lang"); }}
                      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 text-left">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                        <Globe size={18} className="text-sky-300" />
                      </div>
                      <div className="flex-1">
                        <div className="font-black text-sm">Fanmi nan dyaspora</div>
                        <div className="text-[11px] text-white/55">Yon moun nan etranje ki ka ede</div>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => setStep("who")} className="inline-flex items-center gap-1 text-[12px] text-white/60 mb-3">
                    <ArrowLeft size={14} /> Retour
                  </button>
                  <h2 className="text-lg font-black leading-tight">Nan ki lang?</h2>
                  <p className="text-[13px] text-white/65 mt-1.5 leading-relaxed">
                    Choisis la langue du message — selon la personne à qui tu l'envoies.
                  </p>

                  <div className="mt-5 space-y-2.5">
                    <button onClick={() => pick("fr")}
                      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 text-left">
                      <span className="text-xl">🇫🇷</span>
                      <span className="flex-1 font-black text-sm">Français</span>
                      <MessageCircle size={18} className="text-emerald-400" />
                    </button>
                    <button onClick={() => pick("kr")}
                      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 text-left">
                      <span className="text-xl">🇭🇹</span>
                      <span className="flex-1 font-black text-sm">Kreyòl</span>
                      <MessageCircle size={18} className="text-emerald-400" />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
