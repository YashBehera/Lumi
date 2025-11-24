"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./voice/page.module.css";

/**
 * VoicePage
 *
 * - Keeps your VAD / RMS logic and silence timeout unchanged.
 * - Streams PCM16 (24kHz) base64 chunks to server under { type: "audio_chunk", audio: <base64> }.
 * - Sends start_recording / stop_recording messages to the server.
 * - Plays incoming PCM16 base64 audio chunks from server in realtime via a single AudioContext.
 * - Logs transcription messages from server.
 */

export default function VoicePage() {
  const [aispeaking, setAiSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Refs to keep stable objects & sync state
  const listening_ref = useRef(false);
  const processing_ref = useRef(false);
  const aispeaking_ref = useRef(false);
  const silence_timer_ref = useRef<number | null>(null);
  const socket_ref = useRef<WebSocket | null>(null);
  const audio_ctx_ref = useRef<AudioContext | null>(null);
  // capture refs used by recording logic
  const stream_ref = useRef<MediaStream | null>(null);
  const source_ref = useRef<MediaStreamAudioSourceNode | null>(null);
  const processor_ref = useRef<ScriptProcessorNode | null>(null);

  // Playback queue for incoming PCM16 audio from server (Float32 chunks)
  const audioBufferQueue_ref = useRef<Float32Array[]>([]);
  const isPlaying_ref = useRef(false);

  // Playback runner: pulls Float32 chunks from queue and plays them sequentially
  const processAudioQueue = useCallback(async () => {
    const ctx = audio_ctx_ref.current!;
    if (!ctx) return;

    if (audioBufferQueue_ref.current.length === 0) {
      // empty queue -> stop playing
      isPlaying_ref.current = false;
      setAiSpeaking(false);
      return;
    }

    // get next chunk
    const float32 = audioBufferQueue_ref.current.shift()!;
    // create buffer with sampleRate 24000 mono
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

    src.onended = () => {
      // recursively play next chunk
      setTimeout(() => {
        processAudioQueue();
      }, 0);
    };

    // start playback
    try {
      // if context is suspended (lack of user gesture), try resume
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      src.start();
    } catch (err) {
      console.error("Error starting audio source:", err);
      // make sure we continue processing queue
      setTimeout(() => processAudioQueue(), 0);
    }
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    listening_ref.current = listening;
  }, [listening]);
  useEffect(() => {
    processing_ref.current = processing;
  }, [processing]);
  useEffect(() => {
    aispeaking_ref.current = aispeaking;
  }, [aispeaking]);

  // Initialize websocket and persistent AudioContext for playback on mount
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    socket_ref.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected to server");
    };

    ws.onerror = (err) => {
      console.error("⚠️ Socket error:", err);
    };

    ws.onclose = (e) => {
      console.log("🔌 Connection closed", e.code, e.reason);
    };

    // create persistent audio context for playback (do not resume yet)
    audio_ctx_ref.current = new AudioContext({ sampleRate: 24000 });

    ws.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(ev.data);

        if (msg.type === "audio_chunk") {
          // msg.data is base64 PCM16 (server should send PCM16 base64)
          // convert to Float32 and queue for playback
          const base64 = msg.data;
          if (!base64) return;
          const pcm8 = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          // pcm16 view (little-endian)
          const pcm16 = new Int16Array(pcm8.buffer);
          const float32 = new Float32Array(pcm16.length);
          for (let i = 0; i < pcm16.length; i++) {
            const v = pcm16[i];
            float32[i] = v < 0 ? v / 0x8000 : v / 0x7fff;
          }
          // push to queue & start playing if idle
          audioBufferQueue_ref.current.push(float32);
          if (!isPlaying_ref.current) {
            isPlaying_ref.current = true;
            setAiSpeaking(true);
            processAudioQueue(); // fire-and-forget
          }
        } else if (msg.type === "transcription") {
          // server forwarded transcription text
          console.log("📝 Transcription from server:", msg.text);
        } else if (msg.type === "processing_complete") {
          console.log("✅ Processing complete");
          setProcessing(false);
        } else if (msg.type === "error") {
          console.error("Server error:", msg.message);
          setProcessing(false);
        } else {
          // optional debug:
          // console.log("Server message:", msg);
        }
      } catch (err) {
        console.error("Error handling server message:", err);
      }
    };

    return () => {
      console.log("🧹 cleanup client socket");
      ws.close();
      // release audio context if needed
      audio_ctx_ref.current?.close().catch(() => {});
    };
  }, []);

  // Convert Float32 -> PCM16 base64 (browser-compatible)
  function float32ToPCM16Base64(float32Array: Float32Array) {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    // Convert to binary string in chunks (avoid apply on large arrays)
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(sub));
    }
    return btoa(binary);
  }

  // Downsample Float32Array from srcRate to targetRate (simple linear)
  function downsampleBuffer(buffer: Float32Array, srcRate: number, targetRate: number) {
    if (targetRate === srcRate) return buffer;
    const sampleRateRatio = srcRate / targetRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      // average samples between offsetBuffer and nextOffsetBuffer
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  // stop recording cleaning up script processor & stream
  const stopRecording = () => {
    if (processor_ref.current) {
      try {
        processor_ref.current.disconnect();
      } catch {}
      processor_ref.current = null;
    }
    if (source_ref.current) {
      try {
        source_ref.current.disconnect();
      } catch {}
      source_ref.current = null;
    }
    if (stream_ref.current) {
      stream_ref.current.getTracks().forEach((t) => t.stop());
      stream_ref.current = null;
    }
    setListening(false);
    if (silence_timer_ref.current) {
      clearTimeout(silence_timer_ref.current);
      silence_timer_ref.current = null;
    }
  };

  // RECORDING + VAD logic (keeps your detection logic)
  const recordAudio = async () => {
    // resume playback context (user gesture)
    if (audio_ctx_ref.current && audio_ctx_ref.current.state === "suspended") {
      await audio_ctx_ref.current.resume();
    }

    // Acquire mic with desired constraints (mono)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    stream_ref.current = stream;

    // Create an AudioContext for capturing if not present (we use separate capture ctx to avoid changing playback ctx)
    const captureCtx = new AudioContext(); // will have default system sampleRate (likely 48000)
    const actualRate = captureCtx.sampleRate;
    console.log("capture sampleRate:", actualRate);

    const source = captureCtx.createMediaStreamSource(stream);
    source_ref.current = source;

    // analyser for VAD (keeps your logic)
    const analyser = captureCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    // ScriptProcessor for direct PCM capture
    // buffer size 4096 is common; you used 4096 earlier
    const processor = captureCtx.createScriptProcessor(4096, 1, 1);
    processor_ref.current = processor;

    // We'll accumulate small Float32 segments until we reach the desired chunk size (100ms by your earlier logic)
    const bufferDurationMs = 100; // keep as your previous small chunk size
    const targetSampleRate = 24000;

    let partialBuffers: Float32Array[] = [];

    processor.onaudioprocess = (event) => {
      // If AI is speaking, ignore mic input
      if (aispeaking_ref.current) return;
      if (!listening_ref.current && !processing_ref.current) {
        // not monitoring yet; still run VAD below
      }

      const input = event.inputBuffer.getChannelData(0); // Float32Array
      // push input to partialBuffers
      partialBuffers.push(new Float32Array(input));

      // compute total samples collected
      let total = 0;
      for (const b of partialBuffers) total += b.length;

      // when we have enough sample count (based on capture sample rate), convert/resample and send
      // Need to resample from captureCtx.sampleRate -> 24000
      if (total >= Math.ceil((actualRate * bufferDurationMs) / 1000)) {
        // combine into one Float32Array of length `total`
        const combined = new Float32Array(total);
        let off = 0;
        for (const b of partialBuffers) {
          combined.set(b, off);
          off += b.length;
        }
        partialBuffers = []; // reset

        // Resample to 24000
        const resampled = downsampleBuffer(combined, actualRate, targetSampleRate);

        // Convert to PCM16 base64
        const base64 = float32ToPCM16Base64(resampled);

        // send to server as audio chunk (field name "audio" expected by server)
        socket_ref.current?.send(JSON.stringify({ type: "audio_chunk", audio: base64 }));
      }
    };

    // connect nodes so processor receives audio
    source.connect(processor);
    processor.connect(captureCtx.destination); // necessary in some browsers for ScriptProcessor to run

    // VAD / RMS detection (keeps your RMS logic exactly)
    const data = new Uint8Array(analyser.fftSize);
    const threshold = 0.05;
    const silence_timeout = 3000;

    const checkVolume = () => {
      if (aispeaking_ref.current) {
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
          console.log("🎙️ Started recording and streaming PCM audio...");
        }

        // Reset silence timer
        if (silence_timer_ref.current) clearTimeout(silence_timer_ref.current);
        silence_timer_ref.current = window.setTimeout(() => {
          console.log("🛑 Silence detected — stopping recording");
          stopRecording();
          setProcessing(true);
          // tell server to commit; server will wait for commit confirmation then call response.create
          socket_ref.current?.send(JSON.stringify({ type: "stop_recording" }));
        }, silence_timeout);
      }

      requestAnimationFrame(checkVolume);
    };

    checkVolume();
  };

  return (
    <div className={styles.container}>
      <button onClick={recordAudio} className="px-4 py-2 bg-blue-500 text-white rounded">
        Start AI Voice
      </button>

      <button onClick={stopRecording} className="px-4 py-2 bg-red-500 text-white rounded ml-2">
        Stop
      </button>

      <p className="mt-4 text-white text-lg">
        {aispeaking ? "🤖 AI is speaking..." : processing ? "⏳ Processing..." : listening ? "🎤 Listening..." : "🕒 Idle"}
      </p>
    </div>
  );
}