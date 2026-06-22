// src/components/InstallPrompt.jsx
// Encourages installing the PWA, the easy way:
//  - Android/desktop: a one-tap "Installer" button (native beforeinstallprompt).
//  - iOS Safari (no native prompt): clear step-by-step "Ajouter à l'écran d'accueil".
// Shows as a dismissible bottom card, not a permanent top bar. Hidden once the
// app is installed (standalone) or dismissed (re-appears after 7 days).

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus, Download, Sparkles } from "lucide-react";

const DISMISS_KEY = "laureat.installDismissedAt";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}
function recentlyDismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return t && Date.now() - t < SNOOZE_MS;
  } catch { return false; }
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState(null);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // Android/desktop: capture the native install event.
    const onBIP = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS: no event — show our own instructions after a short delay.
    let t;
    if (isIOS()) t = setTimeout(() => setShow(true), 2500);

    return () => { window.removeEventListener("beforeinstallprompt", onBIP); if (t) clearTimeout(t); };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setShow(false); setShowIosSteps(false);
  };

  const install = async () => {
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice; } catch {}
      setDeferred(null);
      dismiss();
    } else if (isIOS()) {
      setShowIosSteps(true);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-20 left-3 right-3 z-[55] max-w-md mx-auto"
        >
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-4 shadow-2xl ring-1 ring-white/10">
            <button onClick={dismiss} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
              <X size={14} />
            </button>

            {!showIosSteps ? (
              <div className="flex items-center gap-3 pr-6">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm">Installe Laureat AI</div>
                  <div className="text-[11px] text-white/80">Accès rapide, hors-ligne, comme une vraie app.</div>
                </div>
                <button onClick={install}
                  className="flex-shrink-0 bg-white text-violet-700 font-black text-sm px-4 py-2 rounded-xl flex items-center gap-1.5">
                  {isIOS() ? <><Share size={15} /> Voir</> : <><Download size={15} /> Installer</>}
                </button>
              </div>
            ) : (
              <div className="pr-6">
                <div className="font-black text-sm mb-2">Ajouter à l'écran d'accueil</div>
                <ol className="space-y-2 text-[12px] text-white/90">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[10px]">1</span>
                    Appuie sur <Share size={14} className="inline mx-0.5" /> <span className="font-bold">Partager</span> en bas de Safari
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[10px]">2</span>
                    Choisis <Plus size={14} className="inline mx-0.5" /> <span className="font-bold">Sur l'écran d'accueil</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[10px]">3</span>
                    Appuie sur <span className="font-bold">Ajouter</span> — c'est fait !
                  </li>
                </ol>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
