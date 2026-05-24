// src/services/ttsService.js
// Text-to-speech: tries server-side API first, falls back to browser Web Speech API.

let currentAudio = null;
let currentUtterance = null;

export async function speakText(text, lang = "fr-FR") {
  stopSpeaking();
  if (!text) return;

  // Try server-side TTS first (better quality)
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = await response.json();

      if (data?.data?.audioUrl) {
        // Play AI-generated audio
        currentAudio = new Audio(data.data.audioUrl);
        await new Promise((resolve, reject) => {
          currentAudio.onended = resolve;
          currentAudio.onerror = reject;
          currentAudio.play().catch(reject);
        });
        return;
      }

      if (data?.data?.useBrowserFallback) {
        return browserSpeak(text, lang);
      }
    }
  } catch (err) {
    console.warn("Server TTS failed, using browser fallback:", err);
  }

  // Fallback to browser
  return browserSpeak(text, lang);
}

function browserSpeak(text, lang = "fr-FR") {
  if (!("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported");
    return;
  }

  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.95;
    utter.pitch = 1.0;

    // Try to pick a good French voice if available
    const voices = speechSynthesis.getVoices();
    const frenchVoice = voices.find(
      (v) => v.lang.startsWith("fr") && v.localService
    );
    if (frenchVoice) utter.voice = frenchVoice;

    utter.onend = resolve;
    utter.onerror = resolve;
    currentUtterance = utter;
    speechSynthesis.speak(utter);
  });
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
  return Boolean(currentAudio) || (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking);
}
