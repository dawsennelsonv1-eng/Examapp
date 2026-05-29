// src/components/shared/TutorAvatar.jsx
// v17: Each persona has a proper SVG portrait — no more flexed-arm/emoji.
// Distinctive style, skin tone, accessory matches the character.

import { motion } from "framer-motion";

const SIZE_MAP = {
  xs: 24, sm: 32, md: 40, lg: 56, xl: 88, "2xl": 120,
};

// Each portrait is a stylized vector face. Distinguishable, dignified, no emoji.
const PORTRAITS = {
  joseph: (
    // M. Joseph — older man, glasses, gray hair, warm
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="bgJoseph" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1e293b" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bgJoseph)" />
      {/* Head */}
      <ellipse cx="50" cy="48" rx="22" ry="26" fill="#b8835a" />
      {/* Gray hair */}
      <path d="M 28 38 Q 30 22 50 22 Q 70 22 72 38 Q 70 30 50 28 Q 30 30 28 38 Z" fill="#cbd5e1" />
      {/* Glasses */}
      <circle cx="42" cy="48" r="6" fill="none" stroke="#0f172a" strokeWidth="1.5" />
      <circle cx="58" cy="48" r="6" fill="none" stroke="#0f172a" strokeWidth="1.5" />
      <line x1="48" y1="48" x2="52" y2="48" stroke="#0f172a" strokeWidth="1.5" />
      {/* Mustache */}
      <path d="M 42 60 Q 50 63 58 60" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Shoulders / collar */}
      <path d="M 22 88 Q 50 70 78 88 L 78 100 L 22 100 Z" fill="#1e3a8a" />
      <circle cx="50" cy="78" r="2.5" fill="#fbbf24" />
    </svg>
  ),

  tikens: (
    // Ti-Kens — young man, short fade haircut, headphones around neck
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="bgTikens" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0c4a6e" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bgTikens)" />
      {/* Head */}
      <ellipse cx="50" cy="50" rx="20" ry="24" fill="#7c5436" />
      {/* Short hair fade */}
      <path d="M 30 38 Q 32 26 50 26 Q 68 26 70 38 Q 68 32 50 32 Q 32 32 30 38 Z" fill="#1e293b" />
      {/* Eyes */}
      <circle cx="43" cy="48" r="1.5" fill="#0f172a" />
      <circle cx="57" cy="48" r="1.5" fill="#0f172a" />
      {/* Smile */}
      <path d="M 43 60 Q 50 65 57 60" stroke="#0f172a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Headphones around neck */}
      <path d="M 28 78 Q 28 70 35 70 M 72 78 Q 72 70 65 70" stroke="#0f172a" strokeWidth="3" fill="none" />
      <rect x="32" y="76" width="6" height="9" rx="2" fill="#0f172a" />
      <rect x="62" y="76" width="6" height="9" rx="2" fill="#0f172a" />
      {/* Shoulders */}
      <path d="M 22 92 Q 50 76 78 92 L 78 100 L 22 100 Z" fill="#f59e0b" />
    </svg>
  ),

  victoria: (
    // Mlle. Victoria — elegant woman, hair pulled back, earrings, professional
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="bgVic" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#831843" />
          <stop offset="1" stopColor="#be185d" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bgVic)" />
      {/* Hair (pulled back) */}
      <path d="M 28 44 Q 30 22 50 22 Q 70 22 72 44 Q 72 50 70 54 L 30 54 Q 28 50 28 44 Z" fill="#1c1917" />
      {/* Face */}
      <ellipse cx="50" cy="52" rx="19" ry="23" fill="#c89569" />
      {/* Eyes with subtle makeup */}
      <ellipse cx="43" cy="50" rx="2" ry="1.5" fill="#0f172a" />
      <ellipse cx="57" cy="50" rx="2" ry="1.5" fill="#0f172a" />
      <path d="M 40 47 Q 43 46 46 47" stroke="#0f172a" strokeWidth="0.8" fill="none" />
      <path d="M 54 47 Q 57 46 60 47" stroke="#0f172a" strokeWidth="0.8" fill="none" />
      {/* Lips */}
      <path d="M 45 62 Q 50 65 55 62 Q 50 60 45 62 Z" fill="#dc2626" />
      {/* Earrings */}
      <circle cx="31" cy="56" r="2" fill="#fbbf24" />
      <circle cx="69" cy="56" r="2" fill="#fbbf24" />
      {/* Shoulders */}
      <path d="M 24 90 Q 50 74 76 90 L 76 100 L 24 100 Z" fill="#f5f5f4" />
    </svg>
  ),

  marckenson: (
    // M. Marckenson — strong jaw, short hair, intense look, athletic
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="bgMar" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7c2d12" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bgMar)" />
      {/* Head with strong jaw */}
      <path d="M 32 44 Q 32 28 50 26 Q 68 28 68 44 L 66 64 Q 60 76 50 76 Q 40 76 34 64 Z" fill="#a8754f" />
      {/* Buzz cut */}
      <path d="M 30 38 Q 32 22 50 22 Q 68 22 70 38 L 68 36 Q 66 30 50 30 Q 34 30 32 36 Z" fill="#0c0a09" />
      {/* Intense eyes (slight frown) */}
      <path d="M 40 47 L 45 49" stroke="#0c0a09" strokeWidth="1.5" />
      <path d="M 55 49 L 60 47" stroke="#0c0a09" strokeWidth="1.5" />
      <circle cx="43" cy="50" r="1.5" fill="#0c0a09" />
      <circle cx="57" cy="50" r="1.5" fill="#0c0a09" />
      {/* Serious mouth */}
      <line x1="45" y1="63" x2="55" y2="63" stroke="#0c0a09" strokeWidth="1.5" strokeLinecap="round" />
      {/* Athletic top */}
      <path d="M 22 90 Q 50 74 78 90 L 78 100 L 22 100 Z" fill="#171717" />
      <path d="M 42 90 L 50 80 L 58 90" stroke="#dc2626" strokeWidth="2" fill="none" />
    </svg>
  ),

  camille: (
    // Mlle. Camille — warm smile, longer wavy hair, soft features
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="bgCam" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4c1d95" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bgCam)" />
      {/* Wavy hair */}
      <path d="M 26 44 Q 24 64 30 78 Q 28 24 50 22 Q 72 24 70 78 Q 76 64 74 44 Q 72 22 50 22 Q 28 22 26 44 Z" fill="#451a03" />
      {/* Face */}
      <ellipse cx="50" cy="52" rx="19" ry="23" fill="#d4a574" />
      {/* Eyes (round, friendly) */}
      <circle cx="43" cy="50" r="2" fill="#0f172a" />
      <circle cx="57" cy="50" r="2" fill="#0f172a" />
      <circle cx="43.5" cy="49.5" r="0.7" fill="#fff" />
      <circle cx="57.5" cy="49.5" r="0.7" fill="#fff" />
      {/* Eyebrows */}
      <path d="M 40 46 Q 43 44 46 46" stroke="#451a03" strokeWidth="1.2" fill="none" />
      <path d="M 54 46 Q 57 44 60 46" stroke="#451a03" strokeWidth="1.2" fill="none" />
      {/* Big warm smile */}
      <path d="M 42 60 Q 50 68 58 60" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Blush */}
      <circle cx="36" cy="58" r="2.5" fill="#fda4af" opacity="0.5" />
      <circle cx="64" cy="58" r="2.5" fill="#fda4af" opacity="0.5" />
      {/* Cardigan/top */}
      <path d="M 22 90 Q 50 74 78 90 L 78 100 L 22 100 Z" fill="#fbcfe8" />
    </svg>
  ),
};

export default function TutorAvatar({
  personaId = "joseph",
  size = "md",
  speaking = false,
  glow = false,
  onClick,
}) {
  const px = SIZE_MAP[size] || 40;
  const portrait = PORTRAITS[personaId] || PORTRAITS.joseph;

  return (
    <motion.div
      onClick={onClick}
      animate={speaking ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 1.1, repeat: speaking ? Infinity : 0 }}
      className={`relative inline-block rounded-full overflow-hidden ring-2 ring-white/20 ${onClick ? "cursor-pointer" : ""} ${
        glow ? "shadow-lg shadow-violet-500/50" : "shadow-md"
      }`}
      style={{ width: px, height: px }}
    >
      {portrait}
      {speaking && (
        <motion.div
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-violet-400"
        />
      )}
    </motion.div>
  );
}
