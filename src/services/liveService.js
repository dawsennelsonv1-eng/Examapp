// src/services/liveService.js v20
// DIRECT WebSocket connection with API key.
// Per docs: wss://...v1beta.GenerativeService.BidiGenerateContent?key={API_KEY}
// First message: full setup with model, config, system_instruction, speechConfig.
// Tries multiple models from the backend until one connects.

const WS_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export class GeminiLiveSession {
  constructor({ onTranscript, onStatus, onError, onTutorTurn }) {
    this.ws = null;
    this.mediaStream = null;
    this.videoStream = null;
    this.audioContext = null;
    this.processor = null;
    this.isRecording = false;
    this.isConnected = false;
    this.isReady = false;
    this.onTranscript = onTranscript || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onError = onError || (() => {});
    this.onTutorTurn = onTutorTurn || (() => {});
    this.audioQueue = [];
    this.isPlaying = false;
    this.playbackContext = null;
    this.videoCaptureInterval = null;
    this.model = null;
    this.voiceName = null;
    this.systemPrompt = null;
  }

  async connect(apiKey, model, voiceName, systemPrompt) {
    this.onStatus("connecting");
    this.model = model;
    this.voiceName = voiceName;
    this.systemPrompt = systemPrompt;

    return new Promise((resolve, reject) => {
      try {
        const url = `${WS_BASE}?key=${encodeURIComponent(apiKey)}`;
        console.log("[Live] Connecting to:", WS_BASE, "model:", model);
        this.ws = new WebSocket(url);

        const timeout = setTimeout(() => {
          if (!this.isReady) {
            this.ws?.close();
            reject(new Error("Connection timeout"));
          }
        }, 10000);

        this.ws.onopen = () => {
          console.log("[Live] WS open. Sending setup...");
          const setupMessage = {
            setup: {
              model: `models/${model}`,
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName } },
                },
              },
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              outputAudioTranscription: {},
              inputAudioTranscription: {},
            },
          };
          this.ws.send(JSON.stringify(setupMessage));
          this.isConnected = true;
          this.onStatus("connected");
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event).then(() => {
            if (this.isReady && !this._resolved) {
              this._resolved = true;
              clearTimeout(timeout);
              resolve();
            }
          });
        };

        this.ws.onerror = (err) => {
          console.error("[Live] WS error:", err);
          this.onError(new Error("Erè koneksyon WebSocket"));
          if (!this._resolved) {
            this._resolved = true;
            clearTimeout(timeout);
            reject(new Error("WS error"));
          }
        };

        this.ws.onclose = (e) => {
          console.log("[Live] WS closed. Code:", e.code, "Reason:", e.reason || "(none)");
          this.isConnected = false;
          this.isReady = false;
          if (e.code !== 1000 && e.code !== 1005 && this.isReady) {
            this.onError(new Error(`Koneksyon fèmen (${e.code})`));
          }
          this.onStatus("disconnected");
          if (!this._resolved) {
            this._resolved = true;
            clearTimeout(timeout);
            reject(new Error(`Closed before ready: ${e.code} ${e.reason || ""}`));
          }
        };
      } catch (err) {
        console.error("[Live] connect threw:", err);
        reject(err);
      }
    });
  }

  async handleMessage(event) {
    try {
      let data;
      if (typeof event.data === "string") data = JSON.parse(event.data);
      else if (event.data instanceof Blob) data = JSON.parse(await event.data.text());
      else data = JSON.parse(new TextDecoder().decode(event.data));

      console.log("[Live] msg:", Object.keys(data).join(","));

      if (data.setupComplete !== undefined) {
        console.log("[Live] ✅ Setup complete");
        this.isReady = true;
        this.onStatus("ready");
        return;
      }

      if (data.serverContent) {
        const sc = data.serverContent;
        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) {
              this.queueAudio(part.inlineData.data);
            }
            if (part.text) this.onTutorTurn(part.text);
          }
        }
        if (sc.inputTranscription?.text) this.onTranscript({ role: "user", text: sc.inputTranscription.text });
        if (sc.outputTranscription?.text) this.onTranscript({ role: "tutor", text: sc.outputTranscription.text });
        if (sc.turnComplete) this.onStatus("turn_complete");
        if (sc.interrupted) this.audioQueue = [];
      }
      if (data.error) {
        console.error("[Live] server error:", data.error);
        this.onError(new Error(data.error.message || "Erè serveur"));
      }
    } catch (err) {
      console.warn("[Live] parse error:", err);
    }
  }

  async startRecording() {
    if (this.isRecording) return;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.isRecording) return;
        const pcm16 = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
        const b64 = arrayBufferToBase64(pcm16.buffer);
        this.ws.send(JSON.stringify({
          realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: b64 }] },
        }));
      };
      source.connect(processor);
      processor.connect(this.audioContext.destination);
      this.processor = processor;
      this.isRecording = true;
      this.onStatus("recording");
    } catch (err) {
      this.onError(err);
    }
  }

  stopRecording() {
    if (this.processor) { this.processor.disconnect(); this.processor = null; }
    if (this.mediaStream) { this.mediaStream.getTracks().forEach((t) => t.stop()); this.mediaStream = null; }
    if (this.audioContext) { try { this.audioContext.close(); } catch {} this.audioContext = null; }
    this.isRecording = false;
  }

  async startCamera(facingMode = "environment") {
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const video = document.createElement("video");
      video.srcObject = this.videoStream;
      video.muted = true;
      await video.play();
      this.videoCaptureInterval = setInterval(() => {
        if (!this.isConnected) return;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const b64 = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        this.ws.send(JSON.stringify({
          realtimeInput: { mediaChunks: [{ mimeType: "image/jpeg", data: b64 }] },
        }));
      }, 2000);
      this.onStatus("camera_on");
      return this.videoStream;
    } catch (err) {
      this.onError(err);
      return null;
    }
  }

  stopCamera() {
    if (this.videoCaptureInterval) { clearInterval(this.videoCaptureInterval); this.videoCaptureInterval = null; }
    if (this.videoStream) { this.videoStream.getTracks().forEach((t) => t.stop()); this.videoStream = null; }
    this.onStatus("camera_off");
  }

  queueAudio(b64) {
    this.audioQueue.push(b64);
    if (!this.isPlaying) this.playNext();
  }

  async playNext() {
    if (this.audioQueue.length === 0) { this.isPlaying = false; return; }
    this.isPlaying = true;
    const b64 = this.audioQueue.shift();
    try {
      if (!this.playbackContext) {
        this.playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      }
      const pcm = base64ToArrayBuffer(b64);
      const samples = new Int16Array(pcm);
      const buffer = this.playbackContext.createBuffer(1, samples.length, 24000);
      const ch = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) ch[i] = samples[i] / 32768;
      const src = this.playbackContext.createBufferSource();
      src.buffer = buffer;
      src.connect(this.playbackContext.destination);
      src.onended = () => this.playNext();
      src.start();
    } catch (err) {
      console.warn("[Live] playback err:", err);
      this.playNext();
    }
  }

  disconnect() {
    this.stopRecording();
    this.stopCamera();
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.close(1000);
    this.ws = null;
    this.isConnected = false;
    this.isReady = false;
    this.audioQueue = [];
    if (this.playbackContext) { try { this.playbackContext.close(); } catch {} this.playbackContext = null; }
    this.onStatus("disconnected");
  }
}

function floatTo16BitPCM(f32) {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
function base64ToArrayBuffer(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// Convenience: fetch config from backend + try connecting with first working model
export async function createLiveSession({
  persona = "joseph", language = "fr", exerciseContext = null, studentName = "",
  onTranscript, onStatus, onError, onTutorTurn,
}) {
  console.log("[Live] Fetching config from /api/live-token...");
  const tokenResponse = await fetch("/api/live-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona, language, exerciseContext, studentName }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.json();
    throw new Error(err.error || "Failed to get config");
  }
  const { data } = await tokenResponse.json();
  console.log("[Live] Got config. Models to try:", data.models);

  // Try each model until one connects
  let lastErr = null;
  for (const model of data.models) {
    const session = new GeminiLiveSession({ onTranscript, onStatus, onError, onTutorTurn });
    try {
      await session.connect(data.apiKey, model, data.voiceName, data.systemPrompt);
      console.log("[Live] ✅ Connected with model:", model);
      return session;
    } catch (err) {
      console.warn(`[Live] Model ${model} failed:`, err.message);
      lastErr = err;
      try { session.disconnect(); } catch {}
    }
  }

  throw new Error(`All Live models failed. Last error: ${lastErr?.message}`);
}
