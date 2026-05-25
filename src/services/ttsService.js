// src/services/ttsService.js
// Voice playback. Tries /api/tts first (premium quality), falls back to browser Web Speech.
// Returns audio duration so callers can sync animations.

let currentAudio = null;
let currentUtterance = null;

export async function speakText(text, lang = "fr-FR", isPremium = false) {
  stopSpeaking();
  if (!text) return { duration: 0 };

  // Try server-side TTS first
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, isPremium }),
    });

    if (response.ok) {
      const data = await response.json();

      if (data?.data?.audioUrl) {
        // Play AI-generated audio
        currentAudio = new Audio(data.data.audioUrl);

        // Wait for metadata to get duration
        await new Promise((resolve) => {
          currentAudio.onloadedmetadata = resolve;
          currentAudio.onerror = resolve;
          setTimeout(resolve, 2000); // safety timeout
        });

        const duration = currentAudio.duration || estimateDuration(text);

        // Play and wait for end
        const playPromise = new Promise((resolve) => {
          currentAudio.onended = resolve;
          currentAudio.onerror = resolve;
        });
        currentAudio.play().catch(() => {});

        return { duration, promise: playPromise };
      }

      if (data?.data?.useBrowserFallback) {
        return browserSpeak(text, lang);
      }
    }
  } catch (err) {
    console.warn("Server TTS failed, using browser fallback:", err);
  }

  return browserSpeak(text, lang);
}

function browserSpeak(text, lang = "fr-FR") {
  if (!("speechSynthesis" in window)) {
    return { duration: 0 };
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.95;
  utter.pitch = 1.0;

  const voices = speechSynthesis.getVoices();
  const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));
  if (frenchVoice) utter.voice = frenchVoice;

  currentUtterance = utter;

  const promise = new Promise((resolve) => {
    utter.onend = resolve;
    utter.onerror = resolve;
  });
  speechSynthesis.speak(utter);

  return { duration: estimateDuration(text), promise };
}

function estimateDuration(text) {
  // Rough estimate: ~150 words per minute for French
  const wordCount = text.split(/\s+/).length;
  return (wordCount / 150) * 60;
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (currentUtterance && "speechSynthesis" in window) {
    speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking() {
  if (currentAudio && !currentAudio.paused) return true;
  if (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking) return true;
  return false;
}
