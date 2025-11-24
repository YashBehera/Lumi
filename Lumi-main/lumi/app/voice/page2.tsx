// This page.tsx file is a scratchpad for storing stable version of page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./voice/page.module.css";

export default function VoicePage() {
  const [aispeaking, setAiSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);

  const listening_ref = useRef(false);
  const processing_ref = useRef(false);
  const aispeaking_ref = useRef(false);
  const silence_timer_ref = useRef<number | null>(null);
  const socket_ref = useRef<WebSocket | null>(null);
  const audio_ctx_ref = useRef<AudioContext | null>(null);
  const audioQueue = useRef<AudioBufferSourceNode[]>([]);

  // Keep refs in sync
  useEffect(() => {
    listening_ref.current = listening;
  }, [listening]);

  useEffect(() => {
    processing_ref.current = processing;
  }, [processing]);

  useEffect(() => {
    aispeaking_ref.current = aispeaking;
  }, [aispeaking]);

  // Initialize WebSocket
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");
    socket_ref.current = socket;

    socket.onopen = () => console.log("✅ Connected to server");
    socket.onerror = (err) => console.error("⚠️ Socket error:", err);
    socket.onclose = (e) => console.log("🔌 Connection closed", e.code, e.reason);

    // Create persistent AudioContext for AI playback
    audio_ctx_ref.current = new AudioContext();
   

    socket.onmessage = async (e) => {
      console.log("recieved data from server");
      const msg = JSON.parse(e.data);

      if (msg.type === "audio_chunk") {
        console.log("recieved data.type is audio_chunk");
        const ctx = audio_ctx_ref.current!;
        setAiSpeaking(true);

        // Decode base64 audio data
        const audioData = Uint8Array.from(atob(msg.data), (c) => c.charCodeAt(0)).buffer;
        const decoded = await ctx.decodeAudioData(audioData);

        const src = ctx.createBufferSource();
        src.buffer = decoded;
        src.connect(ctx.destination);
        src.start();

        audioQueue.current.push(src);

  src.onended = () => {
    audioQueue.current.shift();
    if (audioQueue.current.length === 0) {
      setAiSpeaking(false);
      setProcessing(false);
      console.log("🗣️ AI finished speaking, resuming listening...");
    }
      };
    }}
      

    return () => {
      console.log("🧹 Cleanup — closing socket");
      socket.close();
    };
  }, []);


 async function webmBlobToPCM16Base64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer); // Float32 PCM
  const channelData = decoded.getChannelData(0); // mono

  const pcm16 = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return Buffer.from(pcm16.buffer).toString("base64");
};

  // 🎙 Record + detect speaking
  const recordAudio = async () => {

    if (audio_ctx_ref.current?.state === "suspended") {
  await audio_ctx_ref.current.resume();
};//audioctx needs user interaction start since record audio gets triggered after button interaction so audioctx.resume() is added in the record audio func block
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audio_ctx = new AudioContext();
    const source = audio_ctx.createMediaStreamSource(stream);
    const analyser = audio_ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const media_recorder = new MediaRecorder(stream);
    const threshold = 0.05;
    const silence_timeout = 3000;
    const data = new Uint8Array(analyser.fftSize);

    // Convert Blob to base64 before sending
   media_recorder.ondataavailable = async (e) => {
  const base64data = await webmBlobToPCM16Base64(e.data);
  socket_ref.current?.send(JSON.stringify({ type: "audio_chunk", data: base64data }));
};

    const checkVolume = () => {
      if (aispeaking_ref.current) {
        // Don't listen while AI is speaking
        requestAnimationFrame(checkVolume);
        return;
      }

      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const value = (data[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / data.length);

      if (rms > threshold && !processing_ref.current) {
        // User is speaking
        if (!listening_ref.current) {
          setListening(true);
          socket_ref.current?.send(JSON.stringify({ type: "start_recording" }));
          media_recorder.start(250);
          console.log("🎙️ Started recording...");
        }

        // Reset silence timer
        if (silence_timer_ref.current) clearTimeout(silence_timer_ref.current);
        silence_timer_ref.current = window.setTimeout(() => {
          setListening(false);
          setProcessing(true);
          media_recorder.stop();
          console.log("🛑 Silence detected — stopped recording");
        }, silence_timeout);
      }

      requestAnimationFrame(checkVolume);
    };

    checkVolume();

    media_recorder.onstop = async () => {
      // Send to GPT for processing
      socket_ref.current?.send(JSON.stringify({ type: "stop_recording" }));
      socket_ref.current?.send(JSON.stringify({ type: "ai_response_request" }));
    };
  };

  return (
    <div className={styles.container}>
      <button
        onClick={recordAudio}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Start AI Voice
      </button>

      <p className="mt-4 text-white text-lg">
        {aispeaking
          ? "🤖 AI is speaking..."
          : processing
          ? "⏳ Processing..."
          : listening
          ? "🎤 Listening..."
          : "🕒 Idle"}
      </p>
    </div>
  );
}