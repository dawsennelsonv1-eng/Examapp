// src/components/shared/TutorAvatar.jsx
// Visual avatar for each of the 5 tutor personas.
// Uses gradient backgrounds + emoji + initials for v1. Real illustrations can be swapped later.

import { motion } from "framer-motion";
import { PERSONALITIES } from "../../utils/constants";

const SIZE_MAP = {
  xs: { container: "w-7 h-7", text: "text-xs", emoji: "text-base" },
  sm: { container: "w-9 h-9", text: "text-sm", emoji: "text-lg" },
  md: { container: "w-12 h-12", text: "text-base", emoji: "text-2xl" },
  lg: { container: "w-16 h-16", text: "text-xl", emoji: "text-3xl" },
  xl: { container: "w-24 h-24", text: "text-3xl", emoji: "text-5xl" },
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

  return (
    <motion.div
      animate={
        speaking
          ? { scale: [1, 1.05, 1] }
          : {}
      }
      transition={{
        scale: { duration: 1.2, repeat: Infinity },
      }}
      className={`${dims.container} relative rounded-full bg-gradient-to-br ${persona.color} flex items-center justify-center shadow-md flex-shrink-0 ${className} ${
        glow ? "ring-2 ring-white/30" : ""
      }`}
      title={persona.name}
    >
      <span className={dims.emoji}>{persona.icon}</span>
      {speaking && (
        <motion.div
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${persona.color} -z-10`}
        />
      )}
    </motion.div>
  );
}
