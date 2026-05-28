// src/services/liveService.js
// v11: Gemini Live WebSocket client for real-time voice + camera streaming.
// Handles: connection, audio capture/playback, camera frames, transcript events.

const LIVE_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export class GeminiLiveSession {
  constructor({ onTranscript, onAudio, onStatus, onError, onTutorTurn }) {
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.videoStream = null;
    this.audioWorklet = null;
    this.isRecording = false;
    this.isConnected = false;

    this.onTranscript = onTranscript || (() => {});
    this.onAudio = onAudio || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onError = onError || (() => {});
    this.onTutorTurn = onTutorTurn || (() => {});

    this.audioQueue = [];
    this.isPlaying = false;
    this.videoCaptureInterval = null;
  }

  async connect(ephemeralToken, modelName = "models/gemini-3.1-flash-live-preview") {
    this.onStatus("connecting");

    try {
      const url = `${LIVE_WS_URL}?access_token=${encodeURIComponent(ephemeralToken)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // Send setup message
        this.ws.send(JSON.stringify({
          setup: {
            model: modelName,
          },
        }));
        this.isConnected = true;
        this.onStatus("connected");
      };

      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = (err) => {
        console.error("Live WS error:", err);
        this.onError(new Error("Connection error"));
        this.onStatus("error");
      };
      this.ws.onclose = () => {
        this.isConnected = false;
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
        // Binary blob (audio)
        const text = await event.data.text();
        data = JSON.parse(text);
      }

      // Setup confirmation
      if (data.setupComplete) {
        this.onStatus("ready");
        return;
      }

      // Server content (audio + transcript from tutor)
      if (data.serverContent) {
        const sc = data.serverContent;

        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) {
              // Audio response from tutor
              this.queueAudio(part.inlineData.data);
            }
            if (part.text) {
              this.onTutorTurn(part.text);
            }
          }
        }

        if (sc.inputTranscription?.text) {
          this.onTranscript({ role: "user", text: sc.inputTranscription.text });
        }
        if (sc.outputTranscription?.text) {
          this.onTranscript({ role: "tutor", text: sc.outputTranscription.text });
        }
        if (sc.turnComplete) {
          this.onStatus("turn_complete");
        }
      }
    } catch (err) {
      console.warn("Failed to parse Live message:", err);
    }
  }

  async startRecording() {
    if (this.isRecording) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Setup audio context for raw PCM streaming
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(inputData);
        const base64 = arrayBufferToBase64(pcm16.buffer);

        this.ws.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: "audio/pcm;rate=16000",
              data: base64,
            }],
          },
        }));
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);
      this.audioWorklet = processor;
      this.isRecording = true;
      this.onStatus("recording");
    } catch (err) {
      this.onError(err);
    }
  }

  stopRecording() {
    if (this.audioWorklet) {
      this.audioWorklet.disconnect();
      this.audioWorklet = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isRecording = false;
  }

  async startCamera(facingMode = "environment") {
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      // Capture and send frames every 2 seconds (low bandwidth)
      const video = document.createElement("video");
      video.srcObject = this.videoStream;
      video.play();

      this.videoCaptureInterval = setInterval(() => {
        if (!this.isConnected) return;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const base64 = dataUrl.split(",")[1];

        this.ws.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: "image/jpeg",
              data: base64,
            }],
          },
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
    if (this.videoCaptureInterval) {
      clearInterval(this.videoCaptureInterval);
      this.videoCaptureInterval = null;
    }
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((t) => t.stop());
      this.videoStream = null;
    }
    this.onStatus("camera_off");
  }

  sendText(text) {
    if (!this.isConnected) return;
    this.ws.send(JSON.stringify({
      clientContent: {
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      },
    }));
  }

  queueAudio(base64Audio) {
    this.audioQueue.push(base64Audio);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  async playNext() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;
    const base64 = this.audioQueue.shift();

    try {
      const pcm = base64ToArrayBuffer(base64);
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      const samples = new Int16Array(pcm);
      const buffer = ctx.createBuffer(1, samples.length, 24000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) {
        channel[i] = samples[i] / 32768;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        ctx.close();
        this.playNext();
      };
      source.start();
    } catch (err) {
      console.warn("Audio playback failed:", err);
      this.playNext();
    }
  }

  disconnect() {
    this.stopRecording();
    this.stopCamera();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.ws = null;
    this.isConnected = false;
    this.audioQueue = [];
    this.onStatus("disconnected");
  }
}

// ----- Audio helpers -----
function floatTo16BitPCM(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convenience: create a session and connect
export async function createLiveSession({
  persona = "joseph",
  language = "mix",
  exerciseContext = null,
  studentName = "",
  onTranscript,
  onStatus,
  onError,
  onTutorTurn,
}) {
  // 1. Mint ephemeral token
  const tokenResponse = await fetch("/api/live-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona, language, exerciseContext, studentName }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.json();
    throw new Error(err.error || "Failed to get live token");
  }
  const { data } = await tokenResponse.json();

  // 2. Create session
  const session = new GeminiLiveSession({
    onTranscript, onStatus, onError, onTutorTurn,
  });

  await session.connect(data.token);
  return session;
}
