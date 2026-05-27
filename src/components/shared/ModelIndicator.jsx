// src/components/shared/ModelIndicator.jsx
// Floating badge showing which AI model was used.

import { motion } from "framer-motion";

const MODEL_DISPLAY = {
  "google/gemini-3.5-flash-lite": { name: "Gemini 3.5 Flash Lite", emoji: "⚡", color: "from-blue-500 to-cyan-600" },
  "google/gemini-3.5-flash": { name: "Gemini 3.5 Flash", emoji: "💨", color: "from-blue-600 to-indigo-600" },
  "google/gemini-3.1-pro": { name: "Gemini 3.1 Pro", emoji: "🧠", color: "from-indigo-600 to-purple-700" },
  "google/gemini-3-pro-preview": { name: "Gemini 3 Pro", emoji: "🧠", color: "from-indigo-600 to-purple-700" },
  "google/gemini-3-flash-preview": { name: "Gemini 3 Flash", emoji: "💨", color: "from-blue-500 to-indigo-600" },
  "openai/gpt-5.5": { name: "GPT-5.5", emoji: "🚀", color: "from-emerald-500 to-teal-600" },
  "openai/gpt-5.4": { name: "GPT-5.4", emoji: "⭐", color: "from-emerald-500 to-teal-600" },
  "openai/whisper-large-v3": { name: "Whisper v3", emoji: "🎙️", color: "from-purple-500 to-pink-600" },
  "anthropic/claude-opus-4.7": { name: "Claude Opus 4.7", emoji: "🎨", color: "from-amber-500 to-orange-600" },
  "fish-audio-s2": { name: "Fish Audio S2", emoji: "🐟", color: "from-cyan-500 to-blue-600" },
  "elevenlabs-v3": { name: "ElevenLabs v3", emoji: "🔊", color: "from-purple-600 to-pink-600" },
  "inworld-realtime-1.5": { name: "Inworld TTS", emoji: "🎤", color: "from-violet-500 to-indigo-600" },
  "openai-gpt-4o-mini-tts": { name: "OpenAI Mini TTS", emoji: "🔉", color: "from-slate-500 to-slate-700" },
  "browser-fallback": { name: "Browser TTS", emoji: "📢", color: "from-slate-600 to-slate-800" },
};

export default function ModelIndicator({ modelUsed, position = "bottom-right", size = "sm" }) {
  if (!modelUsed) return null;

  const info = MODEL_DISPLAY[modelUsed] || { name: modelUsed, emoji: "🤖", color: "from-slate-500 to-slate-700" };

  const positionClasses = {
    "top-right": "top-2 right-2",
    "top-left": "top-2 left-2",
    "bottom-right": "bottom-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "inline": "",
  };

  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.5",
    sm: "text-[10px] px-2 py-1",
    md: "text-xs px-2.5 py-1.5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${
        position === "inline" ? "inline-flex" : `absolute ${positionClasses[position]} z-20`
      } ${sizeClasses[size]} bg-gradient-to-r ${info.color} text-white font-mono font-bold rounded-full shadow-md flex items-center gap-1 backdrop-blur-sm`}
      title={`AI used: ${modelUsed}`}
    >
      <span>{info.emoji}</span>
      <span className="opacity-90">{info.name}</span>
    </motion.div>
  );
}

export function ModelIndicatorInline({ modelUsed }) {
  return <ModelIndicator modelUsed={modelUsed} position="inline" size="xs" />;
}
