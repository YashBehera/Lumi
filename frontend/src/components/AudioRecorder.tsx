import { useRef, useState } from 'react';

export function AudioRecorder({ interviewId }: { interviewId: string }) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      await uploadAudio(blob);
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setRecording(true);
    setStatus('Recording...');
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setStatus('Processing...');
  }

  async function uploadAudio(blob: Blob) {
    try {
      const form = new FormData();
      form.append('audio', blob, `answer-${Date.now()}.webm`);
      const res = await fetch(
        `http://localhost:4000/api/interviews/${interviewId}/audio`,
        { method: 'POST', body: form }
      );
      if (!res.ok) throw new Error('Upload failed');
      setStatus('Uploaded');
    } catch (e) {
      console.error(e);
      setStatus('Upload error');
    }
  }

  return (
    <div className="flex items-center gap-4">
      {!recording ? (
        <button
          className="px-4 py-2 rounded bg-emerald-600 text-white text-sm"
          onClick={startRecording}
        >
          Start Answer
        </button>
      ) : (
        <button
          className="px-4 py-2 rounded bg-red-600 text-white text-sm"
          onClick={stopRecording}
        >
          Stop
        </button>
      )}
      <span className="text-xs text-gray-400">{status}</span>
    </div>
  );
}
