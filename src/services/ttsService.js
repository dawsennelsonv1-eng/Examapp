// src/services/ttsService.js
// Wave 1: TTS with proper pause/resume + persona-aware voice + model metadata.

let currentAudio = null;
let currentUtterance = null;
let lastModelUsed = null;

export async function speakText(text, lang = "fr-FR", options = {}) {
  const { isPremium = false, persona = "joseph", onModelUsed } = options;

  stopSpeaking();
  if (!text) return { duration: 0, modelUsed: null };

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, isPremium, persona }),
    });

    if (response.ok) {
      const data = await response.json();
      lastModelUsed = data?.data?.modelUsed;
      onModelUsed?.(lastModelUsed);

      if (data?.data?.audioUrl) {
        currentAudio = new Audio(data.data.audioUrl);
        await new Promise((resolve) => {
          currentAudio.onloadedmetadata = resolve;
          currentAudio.onerror = resolve;
          setTimeout(resolve, 2000);
        });
        const duration = currentAudio.duration || estimateDuration(text);
        const promise = new Promise((resolve) => {
          currentAudio.onended = resolve;
          currentAudio.onerror = resolve;
        });
        currentAudio.play().catch(() => {});
        return { duration, promise, modelUsed: lastModelUsed };
      }

      if (data?.data?.useBrowserFallback) {
        return browserSpeak(text, lang);
      }
    }
  } catch (err) {
    console.warn("Server TTS failed:", err);
  }

  return browserSpeak(text, lang);
}

function browserSpeak(text, lang = "fr-FR") {
  if (!("speechSynthesis" in window)) {
    return { duration: 0, modelUsed: "browser-fallback" };
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.95;
  utter.pitch = 1.0;

  const voices = speechSynthesis.getVoices();
  const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));
  if (frenchVoice) utter.voice = frenchVoice;

  currentUtterance = utter;
  lastModelUsed = "browser-fallback";

  const promise = new Promise((resolve) => {
    utter.onend = resolve;
    utter.onerror = resolve;
  });
  speechSynthesis.speak(utter);

  return { duration: estimateDuration(text), promise, modelUsed: "browser-fallback" };
}

function estimateDuration(text) {
  const wordCount = text.split(/\s+/).length;
  return (wordCount / 150) * 60;
}

export function pauseSpeaking() {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    return true;
  }
  if (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause();
    return true;
  }
  return false;
}

export function resumeSpeaking() {
  if (currentAudio && currentAudio.paused) {
    currentAudio.play().catch(() => {});
    return true;
  }
  if (typeof speechSynthesis !== "undefined" && speechSynthesis.paused) {
    speechSynthesis.resume();
    return true;
  }
  return false;
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
  if (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking && !speechSynthesis.paused) return true;
  return false;
}

export function isPaused() {
  if (currentAudio && currentAudio.paused && currentAudio.currentTime > 0) return true;
  if (typeof speechSynthesis !== "undefined" && speechSynthesis.paused) return true;
  return false;
}

export function getLastModelUsed() {
  return lastModelUsed;
}

// Voice input — record from mic, transcribe via /api/transcribe
export async function recordAndTranscribe({ onStart, onStop, maxDuration = 30000 } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone not supported");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  let stopped = false;

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioData: reader.result, language: "fr" }),
          });
          if (!response.ok) {
            reject(new Error("Transcription failed"));
            return;
          }
          const data = await response.json();
          resolve({
            text: data?.data?.text || "",
            language: data?.data?.language || "fr",
            modelUsed: data?.data?.modelUsed,
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsDataURL(blob);
    };

    recorder.start();
    onStart?.();

    const timeout = setTimeout(() => {
      if (!stopped) {
        stopped = true;
        recorder.stop();
        onStop?.();
      }
    }, maxDuration);

    // Expose a stop function via a side-effect on the promise
    resolve.stopFn = () => {
      if (!stopped) {
        stopped = true;
        clearTimeout(timeout);
        recorder.stop();
        onStop?.();
      }
    };
  });
}

// Simpler API: returns a recorder controller you can stop manually
export function createVoiceRecorder() {
  let recorder = null;
  let stream = null;
  let chunks = [];
  let onCompleteCallback = null;

  return {
    async start({ onComplete, onError, maxDuration = 30000 }) {
      onCompleteCallback = onComplete;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new MediaRecorder(stream);
        chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          stream?.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const response = await fetch("/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audioData: reader.result, language: "fr" }),
              });
              const data = await response.json();
              onCompleteCallback?.({
                text: data?.data?.text || "",
                modelUsed: data?.data?.modelUsed,
              });
            } catch (err) {
              onError?.(err);
            }
          };
          reader.readAsDataURL(blob);
        };

        recorder.start();
        setTimeout(() => {
          if (recorder?.state === "recording") recorder.stop();
        }, maxDuration);
      } catch (err) {
        onError?.(err);
      }
    },
    stop() {
      if (recorder?.state === "recording") {
        recorder.stop();
      }
    },
    isRecording() {
      return recorder?.state === "recording";
    },
  };
}
