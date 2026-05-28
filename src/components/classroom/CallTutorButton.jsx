// src/components/classroom/CallTutorButton.jsx
// v12: Premium gate REMOVED — available to everyone so you can test the call feature.
// (Re-add the gate later once it works: just check isPremium before opening.)

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import CallTutorSession from "./CallTutorSession";

export default function CallTutorButton({
  personaId,
  exerciseContext = null,
  language = "mix",
  studentName = "",
  isPremium = false, // kept in signature for compatibility, no longer gates
  compact = false,
}) {
  const [callOpen, setCallOpen] = useState(false);

  const handleClick = () => {
    setCallOpen(true);
  };

  if (compact) {
    return (
      <>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleClick}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md bg-gradient-to-br from-emerald-500 to-teal-600"
          title="Appeler le prof"
        >
          <Phone size={16} fill="currentColor" />
        </motion.button>
        {callOpen && (
          <CallTutorSession
            personaId={personaId}
            exerciseContext={exerciseContext}
            language={language}
            studentName={studentName}
            onEnd={() => setCallOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        animate={{
          boxShadow: [
            "0 8px 24px rgba(16, 185, 129, 0.3)",
            "0 8px 30px rgba(16, 185, 129, 0.5)",
            "0 8px 24px rgba(16, 185, 129, 0.3)",
          ],
        }}
        transition={{ boxShadow: { duration: 2.2, repeat: Infinity } }}
        className="w-full p-4 rounded-2xl text-white font-bold shadow-lg flex items-center gap-3 relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600"
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          <Phone size={22} fill="currentColor" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-[10px] uppercase tracking-widest font-black opacity-90">Appel en direct</div>
          <div className="font-bold text-base">Parle au prof en direct</div>
          <div className="text-[11px] opacity-80 mt-0.5">Avec partage caméra</div>
        </div>
      </motion.button>
      {callOpen && (
        <CallTutorSession
          personaId={personaId}
          exerciseContext={exerciseContext}
          language={language}
          studentName={studentName}
          onEnd={() => setCallOpen(false)}
        />
      )}
    </>
  );
}
