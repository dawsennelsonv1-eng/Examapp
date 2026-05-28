// src/components/classroom/CallTutorButton.jsx
// v11: Premium button to start real-time voice call with tutor.

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CallTutorSession from "./CallTutorSession";

export default function CallTutorButton({
  personaId,
  exerciseContext = null,
  language = "mix",
  studentName = "",
  isPremium = false,
  compact = false,
}) {
  const navigate = useNavigate();
  const [callOpen, setCallOpen] = useState(false);

  const handleClick = () => {
    if (!isPremium) {
      navigate("/paywall");
      return;
    }
    setCallOpen(true);
  };

  if (compact) {
    return (
      <>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleClick}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md ${
            isPremium
              ? "bg-gradient-to-br from-emerald-500 to-teal-600"
              : "bg-gradient-to-br from-amber-500 to-orange-600"
          }`}
          title={isPremium ? "Appeler le prof" : "Premium feature"}
        >
          {isPremium ? <Phone size={16} fill="currentColor" /> : <Crown size={14} />}
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
        animate={
          isPremium
            ? {
                boxShadow: [
                  "0 8px 24px rgba(16, 185, 129, 0.3)",
                  "0 8px 30px rgba(16, 185, 129, 0.5)",
                  "0 8px 24px rgba(16, 185, 129, 0.3)",
                ],
              }
            : {}
        }
        transition={{ boxShadow: { duration: 2.2, repeat: Infinity } }}
        className={`w-full p-4 rounded-2xl text-white font-bold shadow-lg flex items-center gap-3 relative overflow-hidden ${
          isPremium
            ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600"
            : "bg-gradient-to-br from-amber-500 via-orange-500 to-red-600"
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          {isPremium ? (
            <Phone size={22} fill="currentColor" />
          ) : (
            <Crown size={22} />
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="text-[10px] uppercase tracking-widest font-black opacity-90">
            {isPremium ? "Appel en direct" : "Premium"}
          </div>
          <div className="font-bold text-base">
            {isPremium ? "Parle au prof en direct" : "Débloque l'appel direct"}
          </div>
          <div className="text-[11px] opacity-80 mt-0.5">
            {isPremium ? "Avec partage caméra" : "Avec partage caméra · 2400 HTG"}
          </div>
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
