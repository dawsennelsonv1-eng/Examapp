// src/components/shared/TutorAvatar.jsx — v24
// Renders the polished illustrated avatar (persona.avatarUrl). Falls back to the
// gradient + emoji only if the image is missing or fails to load.

import { useState } from "react";
import { motion } from "framer-motion";
import { PERSONALITIES } from "../../utils/constants";

const SIZE_MAP = {
  xs: { container: "w-7 h-7",   emoji: "text-base" },
  sm: { container: "w-9 h-9",   emoji: "text-lg" },
  md: { container: "w-12 h-12", emoji: "text-2xl" },
  lg: { container: "w-16 h-16", emoji: "text-3xl" },
  xl: { container: "w-24 h-24", emoji: "text-5xl" },
};

export default function TutorAvatar({
  personaId,
  size = "sm",
  speaking = false,
  glow = false,
  className = "",
}) {
  const persona = PERSONALITIES.find((p) => p.id === personaId) || PERSONALITIES[0];
  const dims = SIZE_MAP[size] || SIZE_MAP.sm;
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = persona.avatarUrl && !imgFailed;

  return (
    <motion.div
      animate={speaking ? { scale: [1, 1.05, 1] } : {}}
      transition={{ scale: { duration: 1.2, repeat: Infinity } }}
      className={`${dims.container} relative rounded-full overflow-hidden bg-gradient-to-br ${persona.color || "from-violet-500 to-indigo-700"} flex items-center justify-center shadow-md flex-shrink-0 ${className} ${glow ? "ring-2 ring-white/30" : ""}`}
      title={persona.name}
    >
      {showImg ? (
        <img
          src={persona.avatarUrl}
          alt={persona.name}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
          draggable={false}
        />
      ) : (
        <span className={dims.emoji}>{persona.icon}</span>
      )}

      {speaking && (
        <motion.div
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${persona.color || "from-violet-500 to-indigo-700"} -z-10`}
        />
      )}
    </motion.div>
  );
}
