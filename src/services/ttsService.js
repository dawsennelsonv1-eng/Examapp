// src/services/ttsService.js
// v16: Aggressive parallel playback. First sentence fires immediately on speakText().
// Audio plays as soon as that ~1-2s call returns. Subsequent sentences pre-fetched.

let currentAudio = null;
let currentUtterance = null;
let lastModelUsed = null;
let cancelToken = { cancelled: false };

function splitIntoSentences(text) {
  // Split aggressively at sentence boundaries. Keep chunks 60-180 chars for fastest TTS.
  const sentences = text
    .replace(/\s+/g, " ")
    .match(/[^.!?…]+[.!?…]+|\S[^.!?…]*$/g) || [text];

  const chunks = [];
  let buf = "";
  for (const s of sentences) {
    const candidate = (buf + " " + s).trim();
    if (candidate.length > 180 && buf) {
      chunks.push(buf.trim());
      buf = s;
    } else if (buf.length > 60 && s.length > 30) {
      // commit the buffer and start new one to keep chunks small for speed
      chunks.push(buf.trim());
      buf = s;
    } else {
      buf = candidate;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.filter((c) => c.length > 0);
}

async function fetchChunkAudio(text, persona, attempt = 0) {
  try {
    const t0 = Date.now();
    const response = await fetch("/api/content?task=tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, persona }),
    });
    if (!response.ok) {
      if (attempt < 1) { await new Promise((r) => setTimeout(r, 400)); return fetchChunkAudio(text, persona, attempt + 1); }
      return null;
    }
    const data = await response.json();
    lastModelUsed = data?.data?.modelUsed;
    console.log(`[TTS] chunk "${text.substring(0, 30)}..." fetched in ${Date.now() - t0}ms`);
    if (data?.data?.audioUrl) return { audioUrl: data.data.audioUrl };
    if (data?.data?.useBrowserFallback) {
      // Server couldn't get a Gemini voice for this chunk. Retry once before
      // accepting the low-quality browser voice — the failure is usually a
      // transient rate-limit, and a second try keeps the voice consistent.
      if (attempt < 1) { await new Promise((r) => setTimeout(r, 500)); return fetchChunkAudio(text, persona, attempt + 1); }
      return { useBrowserFallback: true, text };
    }
    return null;
  } catch {
    if (attempt < 1) { await new Promise((r) => setTimeout(r, 400)); return fetchChunkAudio(text, persona, attempt + 1); }
    return null;
  }
}

function playAudioUrl(audioUrl) {
  return new Promise((resolve) => {
    const audio = new Audio();
    currentAudio = audio;
    audio.src = audioUrl;
    // Use loadeddata (more reliable than oncanplay on iOS) + immediate play attempt
    let started = false;
    const tryPlay = () => {
      if (started || cancelToken.cancelled) return;
      started = true;
      audio.play().catch(() => resolve());
    };
    audio.oncanplay = tryPlay;
    audio.onloadeddata = tryPlay;
    audio.onended = resolve;
    audio.onerror = () => resolve();
    setTimeout(resolve, 30000);
  });
}

export async function speakText(text, lang = "fr-FR", options = {}) {
  const { persona = "joseph", onModelUsed, onChunkStart, onChunkEnd } = options;

  stopSpeaking();
  if (!text) return { duration: 0, modelUsed: null, chunks: [] };

  cancelToken = { cancelled: false };
  const myToken = cancelToken;

  const chunks = splitIntoSentences(text);
  if (chunks.length === 0) return { duration: 0, modelUsed: null, chunks: [] };

  // CRITICAL: start fetching ALL chunks in parallel (the first plays immediately,
  // the rest are pre-fetched so playback is gapless).
  const pendingFetches = chunks.map((c) => fetchChunkAudio(c, persona));

  const playbackPromise = (async () => {
    for (let i = 0; i < chunks.length; i++) {
      if (myToken.cancelled) break;
      const audioResult = await pendingFetches[i];
      if (myToken.cancelled) break;
      onModelUsed?.(lastModelUsed);
      // Fire RIGHT BEFORE this chunk is heard, so the UI can reveal the matching
      // text at the same moment the audio for it starts (text↔speech sync).
      onChunkStart?.(i, chunks[i]);
      if (audioResult?.audioUrl) {
        await playAudioUrl(audioResult.audioUrl);
      } else if (audioResult?.useBrowserFallback) {
        await browserSpeakChunk(audioResult.text, lang, persona);
      }
      onChunkEnd?.(i, chunks[i]);
    }
  })();

  // Return the chunks synchronously so the caller can align its text to them.
  return { duration: 0, promise: playbackPromise, modelUsed: lastModelUsed, chunks };
}

// Tutor genders (must match the personas/voices defined server-side).
const PERSONA_GENDER = {
  joseph: "male", marckenson: "male", tikens: "male",
  victoria: "female", camille: "female",
};

// Best-effort: from the available system voices, pick a French one whose gender
// matches the tutor. Browser voice metadata is inconsistent across devices, so we
// score by name hints and fall back gracefully. This stops a male tutor from
// abruptly speaking in the default female Google voice when fallback kicks in.
function pickFrenchVoice(wantGender) {
  const voices = (typeof speechSynthesis !== "undefined" ? speechSynthesis.getVoices() : []) || [];
  const fr = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("fr"));
  if (fr.length === 0) return null;

  const FEMALE_HINTS = ["female", "femme", "amelie", "amélie", "audrey", "marie", "celine", "céline", "google français"];
  const MALE_HINTS = ["male", "homme", "thomas", "nicolas", "daniel", "paul", "henri"];
  const hints = wantGender === "female" ? FEMALE_HINTS : MALE_HINTS;
  const anti = wantGender === "female" ? MALE_HINTS : FEMALE_HINTS;
  const nameOf = (v) => (v.name || "").toLowerCase();

  // 1) a French voice whose name matches the wanted gender
  let pick = fr.find((v) => hints.some((h) => nameOf(v).includes(h)));
  // 2) otherwise any French voice NOT obviously the opposite gender
  if (!pick) pick = fr.find((v) => !anti.some((h) => nameOf(v).includes(h)));
  // 3) otherwise just the first French voice
  return pick || fr[0];
}

function browserSpeakChunk(text, lang = "fr-FR", persona = "joseph") {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) { resolve(); return; }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.95;
    const wantGender = PERSONA_GENDER[persona] || "male";
    const voice = pickFrenchVoice(wantGender);
    if (voice) utter.voice = voice;
    // Nudge male voices a touch lower so a female fallback voice (if that's all the
    // device has) is less jarring against a male tutor.
    if (wantGender === "male") utter.pitch = 0.9;
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
