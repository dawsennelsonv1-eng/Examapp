// src/services/ttsService.js
// v12: Audio plays as soon as the network returns. No waiting on slow loadedmetadata.
// Falls back to browser TTS if server returns useBrowserFallback.

let currentAudio = null;
let currentUtterance = null;
let lastModelUsed = null;

export async function speakText(text, lang = "fr-FR", options = {}) {
  const { persona = "joseph", onModelUsed } = options;

  stopSpeaking();
  if (!text) return { duration: 0, modelUsed: null };

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, persona }),
    });

    if (response.ok) {
      const data = await response.json();
      lastModelUsed = data?.data?.modelUsed;
      onModelUsed?.(lastModelUsed);

      if (data?.data?.audioUrl) {
        const audio = new Audio();
        currentAudio = audio;
        audio.src = data.data.audioUrl;

        // Start playing as soon as enough data is buffered, don't wait for full load
        const playPromise = new Promise((resolve) => {
          audio.oncanplay = () => {
            audio.play().catch((err) => {
              console.warn("Audio play failed:", err);
              resolve();
            });
          };
          audio.onended = resolve;
          audio.onerror = (e) => {
            console.warn("Audio error:", e);
            resolve();
          };
          // Safety timeout: if audio doesn't start in 5s, give up
          setTimeout(resolve, 30000);
        });

        return { duration: 0, promise: playPromise, modelUsed: lastModelUsed };
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

  return { duration: 0, promise, modelUsed: "browser-fallback" };
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
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = "";
    } catch {}
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

// ============================================================
// VOICE INPUT — uses MediaRecorder + /api/transcribe (Gemini Audio)
// ============================================================
export function createVoiceRecorder() {
  let recorder = null;
  let stream = null;
  let chunks = [];
  let mimeType = "";

  return {
    async start({ onComplete, onError, maxDuration = 60000 }) {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Microphone API not available");
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Pick supported MIME
        const mimeOptions = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg;codecs=opus",
        ];
        for (const m of mimeOptions) {
          if (MediaRecorder.isTypeSupported(m)) { mimeType = m; break; }
        }

        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          stream?.getTracks().forEach((t) => t.stop());
          stream = null;

          if (chunks.length === 0) {
            onError?.(new Error("No audio recorded"));
            return;
          }

          const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const response = await fetch("/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audioData: reader.result, language: "fr" }),
              });
              if (!response.ok) {
                onError?.(new Error(`Transcribe HTTP ${response.status}`));
                return;
              }
              const data = await response.json();
              onComplete?.({
                text: data?.data?.text || "",
                modelUsed: data?.data?.modelUsed,
              });
            } catch (err) {
              onError?.(err);
            }
          };
          reader.readAsDataURL(blob);
        };

        recorder.onerror = (e) => {
          onError?.(e?.error || new Error("Recorder error"));
        };

        recorder.start();

        // Safety stop
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
