// src/components/FeedbackPrompt.jsx
// After a student's first real use (1 scan + talked to the tutor), ask — in
// Kreyòl, on purpose — what they think so far. Stored in the `feedback` table.
// Shows once. Mount it ONCE near the app root: <FeedbackPrompt />

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Heart } from "lucide-react";
import { supabase } from "../lib/supabase";

const FB_GIVEN = "laureat.feedbackGiven";
const SCAN_FLAG = "laureat.firstScanDone";
const TUTOR_FLAG = "laureat.firstTutorDone";

export default function FeedbackPrompt() {
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        if (localStorage.getItem(FB_GIVEN)) return;
        if (localStorage.getItem(SCAN_FLAG) && localStorage.getItem(TUTOR_FLAG)) setShow(true);
      } catch {}
    };
    check();
    const t = setInterval(check, 4000); // flags may flip mid-session
    return () => clearInterval(t);
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      let userId = null, email = null;
      try { const { data } = await supabase.auth.getUser(); userId = data?.user?.id || null; email = data?.user?.email || null; } catch {}
      await supabase.from("feedback").insert({ user_id: userId, email, message: (text.trim() || null) });
    } catch {}
    try { localStorage.setItem(FB_GIVEN, "1"); } catch {}
    setBusy(false); setSent(true);
    setTimeout(() => setShow(false), 1600);
  };

  const dismiss = () => { try { localStorage.setItem(FB_GIVEN, "1"); } catch {} setShow(false); };

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="w-full max-w-sm rounded-3xl bg-slate-900 ring-1 ring-white/10 p-6 text-white relative">
            {!sent ? (
              <>
                <button onClick={dismiss} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <X size={16} />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-3">
                  <Heart size={24} className="text-violet-300" />
                </div>
                <h2 className="text-lg font-black mb-1">Kisa ou panse?</h2>
                <p className="text-sm text-white/65 leading-relaxed mb-4">
                  Ou fin eseye Laureat AI yon ti kras. Di nou fran sa ou panse — sa ede nou anpil. 🙏
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="Ekri sa ou panse la a..."
                  className="w-full p-3 rounded-xl bg-white/5 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-violet-500 placeholder:text-white/35 resize-none"
                />
                <div className="flex gap-2 mt-3">
                  <button onClick={dismiss} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/70 text-sm font-bold">Pita</button>
                  <button onClick={submit} disabled={busy}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    <Send size={15} /> Voye
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">🙏</div>
                <h2 className="text-lg font-black">Mèsi anpil!</h2>
                <p className="text-sm text-white/65 mt-1">Nou tande w. N ap kontinye amelyore.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
