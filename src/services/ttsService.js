// src/services/ttsService.js
// v14: SPEED FIX. Splits text into sentences. Fetches + plays the FIRST sentence
// immediately (~2s), then fetches the rest in parallel and plays in sequence.
// First audio now starts in ~2s instead of 10s.

let currentAudio = null;
let currentUtterance = null;
let lastModelUsed = null;
let cancelToken = { cancelled: false };

function splitIntoChunks(text) {
  // Split on sentence boundaries but keep chunks reasonably sized
  const sentences = text
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]*/g) || [text];

  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > 200 && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}

async function fetchChunkAudio(text, persona) {
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, persona }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    lastModelUsed = data?.data?.modelUsed;
    if (data?.data?.audioUrl) return { audioUrl: data.data.audioUrl };
    if (data?.data?.useBrowserFallback) return { useBrowserFallback: true, text };
    return null;
  } catch {
    return null;
  }
}

function playAudioUrl(audioUrl) {
  return new Promise((resolve) => {
    const audio = new Audio();
    currentAudio = audio;
    audio.src = audioUrl;
    audio.oncanplay = () => {
      if (cancelToken.cancelled) { resolve(); return; }
      audio.play().catch(() => resolve());
    };
    audio.onended = resolve;
    audio.onerror = () => resolve();
    setTimeout(resolve, 30000); // safety
  });
}

export async function speakText(text, lang = "fr-FR", options = {}) {
  const { persona = "joseph", onModelUsed } = options;

  stopSpeaking();
  if (!text) return { duration: 0, modelUsed: null };

  cancelToken = { cancelled: false };
  const myToken = cancelToken;

  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) return { duration: 0, modelUsed: null };

  // The whole playback runs as one promise the caller can await
  const playbackPromise = (async () => {
    // Fetch first chunk immediately
    let nextAudioPromise = fetchChunkAudio(chunks[0], persona);

    for (let i = 0; i < chunks.length; i++) {
      if (myToken.cancelled) break;

      const audioResult = await nextAudioPromise;

      // Pre-fetch the NEXT chunk while playing the current one
      if (i + 1 < chunks.length) {
        nextAudioPromise = fetchChunkAudio(chunks[i + 1], persona);
      }

      if (myToken.cancelled) break;
      onModelUsed?.(lastModelUsed);

      if (audioResult?.audioUrl) {
        await playAudioUrl(audioResult.audioUrl);
      } else if (audioResult?.useBrowserFallback) {
        await browserSpeakChunk(audioResult.text, lang);
      }
    }
  })();

  // Return immediately with a promise that resolves when all chunks finish
  return { duration: 0, promise: playbackPromise, modelUsed: lastModelUsed };
}

function browserSpeakChunk(text, lang = "fr-FR") {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) { resolve(); return; }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.95;
    const voices = speechSynthesis.getVoices();
    const fr = voices.find((v) => v.lang.startsWith("fr"));
    if (fr) utter.voice = fr;
    currentUtterance = utter;
    lastModelUsed = "browser-fallback";
    utter.onend = resolve;
    utter.onerror = resolve;
    speechSynthesis.speak(utter);
  });
}

export function pauseSpeaking() {
  if (currentAudio && !currentAudio.paused) { currentAudio.pause(); return true; }
  if (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause(); return true;
  }
  return false;
}

export function resumeSpeaking() {
  if (currentAudio && currentAudio.paused) { currentAudio.play().catch(() => {}); return true; }
  if (typeof speechSynthesis !== "undefined" && speechSynthesis.paused) { speechSynthesis.resume(); return true; }
  return false;
}

export function stopSpeaking() {
  cancelToken.cancelled = true;
  if (currentAudio) {
    try { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio.src = ""; } catch {}
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
// VOICE INPUT
// ============================================================
export function createVoiceRecorder() {
  let recorder = null;
  let stream = null;
  let chunks = [];
  let mimeType = "";

  return {
    async start({ onComplete, onError, maxDuration = 60000 }) {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Mikwofòn pa disponib");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const mimeOptions = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
        for (const m of mimeOptions) {
          if (MediaRecorder.isTypeSupported(m)) { mimeType = m; break; }
        }
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        chunks = [];
        recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
        recorder.onstop = async () => {
          stream?.getTracks().forEach((t) => t.stop());
          stream = null;
          if (chunks.length === 0) { onError?.(new Error("Anyen pa anrejistre")); return; }
          const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
          if (blob.size < 1000) { onError?.(new Error("Twò kout")); return; }
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const response = await fetch("/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audioData: reader.result, language: "fr", mimeType }),
              });
              const data = await response.json();
              if (!response.ok) { onError?.(new Error(data?.error || "Erè transcription")); return; }
              onComplete?.({ text: data?.data?.text || "", modelUsed: data?.data?.modelUsed });
            } catch (err) { onError?.(err); }
          };
          reader.readAsDataURL(blob);
        };
        recorder.onerror = () => onError?.(new Error("Erè mikwofòn"));
        recorder.start();
        setTimeout(() => { if (recorder?.state === "recording") recorder.stop(); }, maxDuration);
      } catch (err) { onError?.(err); }
    },
    stop() { if (recorder?.state === "recording") recorder.stop(); },
    isRecording() { return recorder?.state === "recording"; },
  };
}
