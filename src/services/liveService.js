// src/services/liveService.js v20
// DIRECT WebSocket connection with API key.
// Per docs: wss://...v1beta.GenerativeService.BidiGenerateContent?key={API_KEY}
// First message: full setup with model, config, system_instruction, speechConfig.
// Tries multiple models from the backend until one connects.

const WS_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export class GeminiLiveSession {
  constructor({ onTranscript, onStatus, onError, onTutorTurn, onToolCall }) {
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
    this.onToolCall = onToolCall || (() => {});
    this.audioQueue = [];
    this.isPlaying = false;
    this.playbackContext = null;
    this.videoCaptureInterval = null;
    this._captureVideo = null;
    this.model = null;
    this.voiceName = null;
    this.systemPrompt = null;
    this.tools = null;
  }

  async connect(apiKey, model, voiceName, systemPrompt, tools = null) {
    this.onStatus("connecting");
    this.model = model;
    this.voiceName = voiceName;
    this.systemPrompt = systemPrompt;
    this.tools = tools;

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
              ...(this.tools ? { tools: this.tools } : {}),
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

      // Function calling: the model asks us to draw on the board.
      if (data.toolCall) {
        const calls = data.toolCall.functionCalls || [];
        for (const fc of calls) {
          try { this.onToolCall(fc); } catch (e) { console.warn("[Live] onToolCall threw:", e); }
          this.sendToolResponse(fc);
        }
        return;
      }
      // The model can cancel a pending tool call — nothing to undo, just ignore.
      if (data.toolCallCancellation) return;

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

  sendToolResponse(fc) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const fr = { name: fc?.name, response: { result: "ok" } };
    if (fc?.id) fr.id = fc.id;
    try {
      this.ws.send(JSON.stringify({ toolResponse: { functionResponses: [fr] } }));
    } catch (e) {
      console.warn("[Live] sendToolResponse failed:", e);
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
    // Robust acquisition: some Android devices fail to start the BACK camera
    // while the mic capture pipeline is live ("Could not start video source")
    // and/or return a track that never produces frames (black). We try a few
    // constraint sets, then wait for the track to actually deliver a frame
    // before returning, so the UI never binds to a dead/black stream.
    const attempts = [
      { video: { facingMode: { exact: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } } },
      { video: true }, // last resort: any camera
    ];

    let stream = null;
    let lastErr = null;
    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!stream) {
      this.onError(lastErr || new Error("Impossible de démarrer la caméra"));
      return null;
    }

    // Confirm the track is live and producing frames before we hand it back.
    try {
      this.videoStream = stream;
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      this._captureVideo = video;

      await new Promise((resolve) => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        video.onloadedmetadata = () => video.play().then(finish).catch(finish);
        video.onloadeddata = finish;
        // Safety: don't hang forever if events don't fire.
        setTimeout(finish, 1500);
      });

      // If the track died immediately, treat as failure (black-screen guard).
      const track = stream.getVideoTracks()[0];
      if (!track || track.readyState === "ended") {
        this.stopCamera();
        this.onError(new Error("La source vidéo n'a pas pu démarrer"));
        return null;
      }

      this.videoCaptureInterval = setInterval(() => {
        if (!this.isConnected || !this._captureVideo) return;
        const v = this._captureVideo;
        if (!v.videoWidth) return; // no frame yet — skip
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        canvas.getContext("2d").drawImage(v, 0, 0);
        const b64 = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            realtimeInput: { mediaChunks: [{ mimeType: "image/jpeg", data: b64 }] },
          }));
        }
      }, 2000);

      this.onStatus("camera_on");
      return this.videoStream;
    } catch (err) {
      this.stopCamera();
      this.onError(err);
      return null;
    }
  }

  stopCamera() {
    if (this.videoCaptureInterval) { clearInterval(this.videoCaptureInterval); this.videoCaptureInterval = null; }
    if (this._captureVideo) { try { this._captureVideo.srcObject = null; } catch {} this._captureVideo = null; }
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

// Function-calling tool: lets the tutor draw on the board during a call.
const BOARD_TOOL = [
  {
    functionDeclarations: [
      {
        name: "draw_board",
        description:
          "Affiche un schéma/dessin sur le tableau pour aider l'élève. À utiliser quand un visuel aide vraiment (figure géométrique, circuit, forces, graphique, anatomie, carte...). Annonce à voix haute que tu dessines.",
        parameters: {
          type: "OBJECT",
          properties: {
            description: {
              type: "STRING",
              description:
                "Description claire et complète de ce qu'il faut dessiner, en français (ex: 'triangle rectangle ABC, angle droit en B, AB=3, BC=4').",
            },
          },
          required: ["description"],
        },
      },
    ],
  },
];

// Convenience: fetch config from backend + try connecting with first working model
export async function createLiveSession({
  persona = "joseph", language = "fr", exerciseContext = null, studentName = "",
  onTranscript, onStatus, onError, onTutorTurn, onToolCall,
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

  // connect() resolves only after setupComplete, so if the `tools` field is
  // rejected the socket closes and connect() throws — we then retry the SAME
  // model WITHOUT tools so the call always works (boards just won't auto-draw).
  let lastErr = null;
  for (const model of data.models) {
    for (const tools of [BOARD_TOOL, null]) {
      const session = new GeminiLiveSession({ onTranscript, onStatus, onError, onTutorTurn, onToolCall });
      try {
        await session.connect(data.apiKey, model, data.voiceName, data.systemPrompt, tools);
        console.log(`[Live] ✅ Connected with model: ${model}${tools ? "" : " (no board tool)"}`);
        return session;
      } catch (err) {
        console.warn(`[Live] Model ${model}${tools ? " +tools" : " -tools"} failed:`, err.message);
        lastErr = err;
        try { session.disconnect(); } catch {}
      }
    }
  }

  throw new Error(`All Live models failed. Last error: ${lastErr?.message}`);
}
