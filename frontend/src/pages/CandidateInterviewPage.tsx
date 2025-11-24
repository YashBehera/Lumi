import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AudioRecorder } from '../components/AudioRecorder';
import { ProctoredShell } from '../components/ProctoredShell';
import { useProctor } from '../hooks/useProctor';
import { useProctorAlerts } from '../hooks/useProctorAlert';

type Question = {
  id: string;
  text: string;        // question text
  type: string;        // "audio" | "text" etc.
  durationSec?: number;
};

type Config = {
  id: string;
  candidateName: string;
  status: string;
  questions: Question[];
  proctorConfig: {
    heartbeatMs: number;
    frameIntervalMs: number;
    focusLossThreshold: number;
  };
};

// Prefer env override if you want later
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export function CandidateInterviewPage() {
  const { id } = useParams<{ id: string }>();
  const interviewId = id || '';
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  // index of the current question
  const [currentIndex, setCurrentIndex] = useState(0);

  // Proctor hook can handle null config (fullscreen, webcam video, focus tracking, etc.)
  const _webcamProctor = useProctor(
    interviewId,
    config ? config.proctorConfig : null
  );

  // 🔴 Live proctor alerts (YOLO: phone detected / multiple people / forbidden objects)
  const alert = useProctorAlerts(interviewId);

  useEffect(() => {
    (async () => {
      if (!interviewId) {
        console.error('No interviewId in URL');
        setLoading(false);
        return;
      }

      try {
        const url = `${API_BASE}/api/interviews/${interviewId}/config`;
        console.log('Fetching interview config from', url);

        const res = await fetch(url);

        console.log('Interview config response status:', res.status);

        if (!res.ok) {
          console.error('Failed to load config:', await res.text());
          setLoading(false);
          return;
        }

        const data = await res.json();

        const safeConfig: Config = {
          ...data,
          questions: Array.isArray(data.questions) ? data.questions : [],
        };

        setConfig(safeConfig);
        setCurrentIndex(0); // start from first question whenever config loads
      } catch (e) {
        console.error('Error loading config', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [interviewId]);

  if (loading) {
    return <div className="p-4 text-slate-100">Loading interview…</div>;
  }

  if (!config || config.questions.length === 0) {
    return (
      <div className="p-4 text-red-400">
        Interview configuration not found or has no questions. Please contact support.
      </div>
    );
  }

  const totalQuestions = config.questions.length;
  const currentQuestion = config.questions[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev < totalQuestions - 1 ? prev + 1 : prev
    );
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  return (
    <ProctoredShell interviewId={interviewId}>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="p-4 border-b border-slate-800 flex justify-between">
          <div>
            <h1 className="font-semibold text-lg">Interview</h1>
            <p className="text-xs text-slate-400">
              Candidate: {config.candidateName}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Proctoring active – do not close this tab
          </span>
        </header>

        {/* 🔴 Live warning banner if YOLO / proctor flags something */}
        {alert?.hasWarning && (
          <div className="mx-6 mt-4 mb-2 rounded-md border border-amber-500 bg-amber-900/40 px-3 py-2 text-xs text-amber-100">
            <strong className="font-semibold">Warning:</strong>{' '}
            {alert.message ||
              'We detected suspicious objects or activity in your camera frame. Please ensure only you are visible and remove any external devices (like phones, books, or extra screens).'}
          </div>
        )}

        <main className="p-6">
          <div className="p-4 rounded-lg border border-slate-800">
            <h2 className="font-medium mb-2">
              {currentQuestion ? currentQuestion.text : 'No questions configured'}
            </h2>
            {currentQuestion?.durationSec && (
              <p className="text-sm text-slate-400 mb-4">
                Please answer in about {currentQuestion.durationSec} seconds.
              </p>
            )}

            <AudioRecorder interviewId={interviewId} />

            <div className="mt-4 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`px-3 py-1 rounded border border-slate-700 ${
                  currentIndex === 0
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-slate-800'
                }`}
              >
                Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= totalQuestions - 1}
                className={`px-3 py-1 rounded bg-emerald-600 ${
                  currentIndex >= totalQuestions - 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-emerald-500'
                }`}
              >
                {currentIndex >= totalQuestions - 1 ? 'Last question' : 'Next question'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </ProctoredShell>
  );
}
