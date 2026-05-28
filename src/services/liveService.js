// src/services/liveService.js
// v13 FIX: Connect to v1alpha BidiGenerateContentConstrained with access_token.
// WAS using v1beta with the token as ?key= — wrong for ephemeral tokens.

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
      // Ephemeral token passed as access_token query param to v1alpha Constrained endpoint
      const url = `${LIVE_WS_BASE}?access_token=${encodeURIComponent(ephemeralToken)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // First message MUST be setup. With Constrained endpoint + token constraints,
        // model/config are already locked in the token, but we still send setup with model.
        this.ws.send(JSON.stringify({ setup: { model: `models/${model}` } }));
        this.isConnected = true;
        this.onStatus("connected");
      };

      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = () => {
        this.onError(new Error("WebSocket connection error"));
        this.onStatus("error");
      };
      this.ws.onclose = (e) => {
        this.isConnected = false;
        if (e.code !== 1000) {
          this.onError(new Error(`Connexion fèmen (code ${e.code})`));
        }
        this.onStatus("disconnected");
      };
    } catch (err) {
      this.onError(err);
      this.onStatus("error");
    }
  }

  async handleMessage(event) {
    try {
      let data;
      if (typeof event.data === "string") {
        data = JSON.parse(event.data);
      } else {
        const text = await event.data.text();
        data = JSON.parse(text);
      }

      if (data.setupComplete) {
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
        if (sc.inputTranscription?.text) {
          this.onTranscript({ role: "user", text: sc.inputTranscription.text });
        }
        if (sc.outputTranscription?.text) {
          this.onTranscript({ role: "tutor", text: sc.outputTranscription.text });
        }
        if (sc.turnComplete) this.onStatus("turn_complete");
      }
    } catch (err) {
      console.warn("Live message parse error:", err);
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
    if (this.audioContext) { this.audioContext.close(); this.audioContext = null; }
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
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;
      const source = this.playbackContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.playbackContext.destination);
      source.onended = () => this.playNext();
      source.start();
    } catch (err) {
      console.warn("Playback error:", err);
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
    if (this.playbackContext) { this.playbackContext.close(); this.playbackContext = null; }
    this.onStatus("disconnected");
  }
}

function floatTo16BitPCM(float32Array) {
  const out = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
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
  const tokenResponse = await fetch("/api/live-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona, language, exerciseContext, studentName }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.json();
    throw new Error(err.details || err.error || "Failed to get live token");
  }
  const { data } = await tokenResponse.json();

  const session = new GeminiLiveSession({ onTranscript, onStatus, onError, onTutorTurn });
  await session.connect(data.token, data.model);
  return session;
}
