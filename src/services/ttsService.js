// src/services/ttsService.js
// Thin wrapper over the Web Speech API. Picks the best voice for fr-FR / ht
// (browsers rarely ship a Haitian Creole voice, so we fall back to French
// with slight rate/pitch adjustment to keep the feel natural.)

let currentUtterance = null;

export function isSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(lang) {
  if (!isSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (lang === "ht") {
    // Try Haitian first, then any French voice (best phonetic approximation).
    return (
      voices.find((v) => v.lang?.toLowerCase().startsWith("ht")) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("fr")) ||
      voices[0]
    );
  }
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("fr")) || voices[0]
  );
}

export function speak(text, lang = "fr", { onEnd, onStart } = {}) {
  if (!isSupported() || !text) return;
  stop(); // always cancel anything queued

  const utter = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(lang);
  if (voice) utter.voice = voice;
  utter.lang = voice?.lang || (lang === "ht" ? "ht" : "fr-FR");
  utter.rate = lang === "ht" ? 0.92 : 0.98; // slightly slower for Creole clarity
  utter.pitch = 1.0;
  utter.onstart = onStart;
  utter.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };
  utter.onerror = () => {
    currentUtterance = null;
    onEnd?.();
  };

  currentUtterance = utter;
  window.speechSynthesis.speak(utter);
}

export function stop() {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking() {
  return isSupported() && window.speechSynthesis.speaking;
}
