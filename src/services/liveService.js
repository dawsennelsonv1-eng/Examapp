// src/services/liveService.js
// v14 CALL FIX: First WebSocket message MUST be { config: {...} } per official docs,
// NOT { setup: {...} }. This was why the call failed at connection.
// Also: detailed console logging so we can see exactly where it breaks.

const LIVE_WS_BASE = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

export class GeminiLiveSession {
  constructor({ onTranscript, onStatus, onError, onTutorTurn }) {
    this.ws = null;
    this.mediaStream = null;
    this.videoStream = null;
    this.audioContext = null;
    this.processor = null;
    this.isRecording = false;
    this.isConnected = false;

    this.onTranscript = onTranscript || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onError = onError || (() => {});
    this.onTutorTurn = onTutorTurn || (() => {});

    this.audioQueue = [];
    this.isPlaying = false;
    this.playbackContext = null;
    this.videoCaptureInterval = null;
    this.model = null;
  }

  async connect(ephemeralToken, model) {
    this.onStatus("connecting");
    this.model = model;
    try {
      const url = `${LIVE_WS_BASE}?access_token=${encodeURIComponent(ephemeralToken)}`;
      console.log("[Live] Connecting to:", LIVE_WS_BASE);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log("[Live] WebSocket open. Sending config...");
        // CRITICAL FIX: first message is { config: {...} } with FULL config inside.
        // (Was { setup: { model } } before — wrong, caused silent failure.)
        const configMessage = {
          config: {
            model: `models/${model}`,
            responseModalities: ["AUDIO"],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
        };
        this.ws.send(JSON.stringify(configMessage));
        this.isConnected = true;
        this.onStatus("connected");
      };

      this.ws.onmessage = (event) => this.handleMessage(event);

      this.ws.onerror = (err) => {
        console.error("[Live] WebSocket error:", err);
        this.onError(new Error("Erè koneksyon WebSocket"));
        this.onStatus("error");
      };

      this.ws.onclose = (e) => {
        console.log("[Live] WebSocket closed. Code:", e.code, "Reason:", e.reason);
        this.isConnected = false;
        if (e.code !== 1000 && e.code !== 1005) {
          this.onError(new Error(`Koneksyon fèmen (${e.code})${e.reason ? ": " + e.reason : ""}`));
        }
        this.onStatus("disconnected");
      };
    } catch (err) {
      console.error("[Live] connect() threw:", err);
      this.onError(err);
      this.onStatus("error");
    }
  }

  async handleMessage(event) {
    try {
      let data;
      if (typeof event.data === "string") {
        data = JSON.parse(event.data);
      } else if (event.data instanceof Blob) {
        const text = await event.data.text();
        data = JSON.parse(text);
      } else {
        const text = new TextDecoder().decode(event.data);
        data = JSON.parse(text);
      }

      console.log("[Live] Message:", Object.keys(data).join(", "));

      if (data.setupComplete !== undefined) {
        console.log("[Live] Setup complete — ready!");
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
        if (sc.interrupted) {
          // User interrupted — clear playback queue
          this.audioQueue = [];
        }
      }

      if (data.error) {
        console.error("[Live] Server error:", data.error);
        this.onError(new Error(data.error.message || "Erè serveur"));
      }
    } catch (err) {
      console.warn("[Live] Parse error:", err, event.data);
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
      console.warn("[Live] Playback error:", err);
      this.playNext();
    }
  }

  disconnect() {
    this.stopRecording();
    this.stopCamera();
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.close(1000);
    this.ws = null;
    this.isConnected = false;
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

export async function createLiveSession({
  persona = "joseph", language = "mix", exerciseContext = null, studentName = "",
  onTranscript, onStatus, onError, onTutorTurn,
}) {
  console.log("[Live] Requesting ephemeral token...");
  const tokenResponse = await fetch("/api/live-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona, language, exerciseContext, studentName }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.json();
    console.error("[Live] Token request failed:", err);
    throw new Error(err.details || err.error || "Failed to get live token");
  }
  const { data } = await tokenResponse.json();
  console.log("[Live] Got token, model:", data.model);

  const session = new GeminiLiveSession({ onTranscript, onStatus, onError, onTutorTurn });
  await session.connect(data.token, data.model);
  return session;
}
