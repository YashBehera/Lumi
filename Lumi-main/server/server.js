import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
dotenv.config();
const key = process.env.OPENAI_API_KEY.trim();
console.log("API key length:", key.length);

const server = new WebSocketServer({ port: 8080 });

const model = "gpt-4o-realtime-preview";
const openai_socket_url = `wss://api.openai.com/v1/realtime?model=${model}`;

let current_client_socket = null;
let is_audio_buffer_ready = false;
let audio_chunks_queue = [];
let is_recording = false;
let has_committed_audio = false;

const openai_socket = new WebSocket(openai_socket_url, {
    headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
    }
});

openai_socket.on("open", () => {
    console.log("✅ server connected to openai");
    is_audio_buffer_ready = true;
});

openai_socket.on("error", (err) => console.error("OpenAI socket error:", err));
openai_socket.on("close", (code, reason) => console.log("OpenAI socket closed:", code, reason));

openai_socket.on("message", (msg) => {
    const data = JSON.parse(msg.toString());
    console.log(data.type + " from openai");



    switch (data.type) {



        case "input_audio_buffer.cleared":
            console.log("✅ Audio buffer cleared, ready for new data");
            is_audio_buffer_ready = true;
            // Process any queued audio chunks
            while (audio_chunks_queue.length > 0 && is_audio_buffer_ready) {
                const chunk = audio_chunks_queue.shift();
                openai_socket.send(JSON.stringify({
                    type: "input_audio_buffer.append",
                    audio: chunk.audio,
                }));
            }
            break;

        case "input_audio_buffer.committed":
            console.log("✅ Audio buffer committed");
            has_committed_audio = true;
            // Automatically request AI response after commit
            console.log("🎯 Auto-requesting AI response after commit");
            openai_socket.send(JSON.stringify({
                type: "response.create",
                response: {
                    modalities: ["audio", "text"], // Must include both
                    instructions: "answer the user in english",
                    conversation: [
                        {
                            role: "system",
                            content: "You are a helpful English-speaking AI assistant. Respond only in English, never in any other language."
                        }
                    ],
                    metadata: { language: "en" },
                    audio: {
                        voice: "verse" // or "alloy", "sage", etc. (English voices)
                    }

                },
            }));
            break;

        case "response.audio.delta":
            // Send audio chunk to client
            if (current_client_socket) {
                current_client_socket.send(JSON.stringify({
                    type: "audio_chunk",
                    data: data.delta,
                }));
            }
            break;

        case "response.audio.done":
            console.log("✅ Audio response completed");
            break;

        case "response.done":
            console.log("✅ Response completed");
            if (current_client_socket) {
                current_client_socket.send(JSON.stringify({
                    type: "processing_complete"
                }));
            }
            // Reset states for next recording
            is_recording = false;
            has_committed_audio = false;
            break;

        case "error":
            console.error("❌ OpenAI error:", data.error);
            if (current_client_socket) {
                current_client_socket.send(JSON.stringify({
                    type: "error",
                    message: data.error.message
                }));
            }
            break;

        case "session.created":
            console.log("✅ Session created");
            is_audio_buffer_ready = true;
            break;

        default:
            console.log("Other message type:", data.type);
    }
});

server.on("connection", (socket) => {
    console.log("a client connected");
    current_client_socket = socket;

    socket.on("message", async (msg) => {
        const data = JSON.parse(msg);
        console.log("Client:", data.type);

        switch (data.type) {
            case "start_recording":
                console.log("🔄 Clearing audio buffer...");
                is_audio_buffer_ready = false;
                is_recording = true;
                has_committed_audio = false;
                audio_chunks_queue = [];
                openai_socket.send(JSON.stringify({
                    type: "input_audio_buffer.clear"
                }));
                break;

            case "audio_chunk":
                if (!is_recording) {
                    console.log("⚠️ Ignoring audio chunk - not recording");
                    break;
                }

                if (is_audio_buffer_ready) {
                    // Send immediately if buffer is ready
                    openai_socket.send(JSON.stringify({
                        type: "input_audio_buffer.append",
                        audio: data.audio,
                    }));
                } else {
                    // Queue the chunk until buffer is ready
                    console.log("⏳ Queueing audio chunk, buffer not ready yet");
                    audio_chunks_queue.push(data);
                }
                break;

            case "stop_recording":


                if (!is_recording) {
                    console.log("⚠️ Ignoring stop_recording - not recording");
                    break;
                }


                console.log("🛑 Stopping recording, committing audio buffer");

                // ✅ Step 1: Commit the audio so it gets transcribed
                openai_socket.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
                is_recording = false;


                break;


        }
    });

    socket.on("close", () => {
        console.log("Client disconnected");
        if (current_client_socket === socket) {
            current_client_socket = null;
        }
    });

    socket.on("error", (err) => {
        console.error("Client socket error:", err);
    });
});