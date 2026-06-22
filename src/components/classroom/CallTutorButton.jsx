// src/components/classroom/CallTutorButton.jsx
// v13: Server-enforced call-minute caps (free 2 / basic 15 / premium 90 per month).
// Before opening a call we ask the server how many minutes remain. If none,
// we show a pay upsell instead. While the call runs, a hard-stop timer ends it
// at the remaining budget, and on end we report the minutes used to the server.

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Phone, X, Clock } from "lucide-react";
import CallTutorSession from "./CallTutorSession";
import { supabase } from "../../lib/supabase";
import WhatsAppPayButton from "../WhatsAppPayButton";

async function getToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

export default function CallTutorButton({
  personaId,
  exerciseContext = null,
  language = "mix",
  studentName = "",
  isPremium = false, // kept for compatibility; server enforces the real limit now
  compact = false,
  autoStart = false,
}) {
  const [callOpen, setCallOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [blocked, setBlocked] = useState(null);   // {message, tier} when out of minutes
  const [maxMinutes, setMaxMinutes] = useState(-1); // -1 = unlimited
  const startedAtRef = useRef(null);
  const stopTimerRef = useRef(null);

  // Ask the server whether a call is allowed, then open it.
  const openCall = async () => {
    if (checking || callOpen) return;
    setChecking(true);
    setBlocked(null);
    try {
      const accessToken = await getToken();
      const res = await fetch("/api/content?task=call_check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
      const body = await res.json();
      if (!res.ok) {
        // On a server/network hiccup, allow the call but with a safe 2-min cap.
        setMaxMinutes(2);
        startedAtRef.current = Date.now();
        setCallOpen(true);
        return;
      }
      const d = body?.data || {};
      if (!d.allowed) {
        setBlocked({
          message: d.message || "Ou fin itilize minit apèl ou yo pou mwa a.",
          tier: d.tier,
        });
        return;
      }
      setMaxMinutes(typeof d.remainingMinutes === "number" ? d.remainingMinutes : -1);
      startedAtRef.current = Date.now();
      setCallOpen(true);
    } catch {
      // Network failure → allow with a conservative 2-min safety cap.
      setMaxMinutes(2);
      startedAtRef.current = Date.now();
      setCallOpen(true);
    } finally {
      setChecking(false);
    }
  };

  // End the call: report minutes used to the server, then close.
  const endCall = async () => {
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    setCallOpen(false);
    const startedAt = startedAtRef.current;
    startedAtRef.current = null;
    if (!startedAt) return;
    const minutes = Math.round(((Date.now() - startedAt) / 60000) * 100) / 100; // 2 decimals
    if (minutes <= 0) return;
    try {
      const accessToken = await getToken();
      await fetch("/api/content?task=call_consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, minutes }),
      });
    } catch {}
  };

  // Hard-stop: when a call is open and minutes are capped, end it at the budget.
  useEffect(() => {
    if (callOpen && maxMinutes > 0) {
      stopTimerRef.current = setTimeout(() => { endCall(); }, maxMinutes * 60000);
      return () => { if (stopTimerRef.current) clearTimeout(stopTimerRef.current); };
    }
  }, [callOpen, maxMinutes]); // eslint-disable-line

  // Auto-start (e.g. from the header call button) — still goes through the gate.
  useEffect(() => {
    if (autoStart) openCall();
  }, [autoStart]); // eslint-disable-line

  const handleClick = () => { openCall(); };

  const Extras = (
    <>
      {callOpen && (
        <CallTutorSession
          personaId={personaId}
          exerciseContext={exerciseContext}
          language={language}
          studentName={studentName}
          maxMinutes={maxMinutes}
          onEnd={endCall}
        />
      )}
      {blocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl bg-slate-900 ring-1 ring-white/10 p-6 text-white relative">
            <button onClick={() => setBlocked(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <X size={16} />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
              <Clock size={26} className="text-emerald-300" />
            </div>
            <h2 className="text-xl font-black mb-1.5">Minit apèl yo fini</h2>
            <p className="text-sm text-white/60 leading-relaxed mb-5">
              {blocked.message} Pase Premium pou 90 minit apèl pa mwa.
            </p>
            <div className="space-y-2">
              <WhatsAppPayButton planId="premium" />
              <WhatsAppPayButton planId="basic" />
            </div>
          </motion.div>
        </div>
      )}
    </>
  );

  if (compact) {
    return (
      <>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleClick}
          disabled={checking}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md bg-gradient-to-br from-emerald-500 to-teal-600 disabled:opacity-60"
          title="Appeler le prof"
        >
          <Phone size={16} fill="currentColor" />
        </motion.button>
        {Extras}
      </>
    );
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        disabled={checking}
        animate={{
          boxShadow: [
            "0 8px 24px rgba(16, 185, 129, 0.3)",
            "0 8px 30px rgba(16, 185, 129, 0.5)",
            "0 8px 24px rgba(16, 185, 129, 0.3)",
          ],
        }}
        transition={{ boxShadow: { duration: 2.2, repeat: Infinity } }}
        className="w-full p-4 rounded-2xl text-white font-bold shadow-lg flex items-center gap-3 relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 disabled:opacity-70"
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          <Phone size={22} fill="currentColor" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-[10px] uppercase tracking-widest font-black opacity-90">Appel en direct</div>
          <div className="font-bold text-base">{checking ? "Verifikasyon..." : "Parle au prof en direct"}</div>
          <div className="text-[11px] opacity-80 mt-0.5">Avec partage caméra</div>
        </div>
      </motion.button>
      {Extras}
    </>
  );
}
