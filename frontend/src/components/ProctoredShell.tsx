import React, { useEffect, useState, useCallback } from 'react';

type Props = {
  interviewId: string;
  children: React.ReactNode; // your interview questions UI
};

type ProctorState = {
  fullscreen: boolean;
  focused: boolean;
  violationCount: number;
  locked: boolean;
  reason?: string;
};

const MAX_VIOLATIONS = 3; // after this, lock the test

async function sendEvent(interviewId: string, type: string, payload: any = {}) {
  try {
    await fetch(`http://localhost:4000/api/interviews/${interviewId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        timestamp: new Date().toISOString(),
        payload,
      }),
    });
  } catch (e) {
    console.warn('proctor event failed', e);
  }
}

export const ProctoredShell: React.FC<Props> = ({ interviewId, children }) => {
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<ProctorState>({
    fullscreen: false,
    focused: true,
    violationCount: 0,
    locked: false,
  });

  const incrementViolation = useCallback(
    async (reason: string) => {
      setState((prev) => {
        if (prev.locked) return prev;
        const nextCount = prev.violationCount + 1;
        const locked = nextCount >= MAX_VIOLATIONS;
        if (locked) {
          sendEvent(interviewId, 'PROCTOR_LOCKED', {
            reason,
            violations: nextCount,
          });
        } else {
          sendEvent(interviewId, 'PROCTOR_VIOLATION', {
            reason,
            violations: nextCount,
          });
        }
        return {
          ...prev,
          violationCount: nextCount,
          locked,
          reason,
        };
      });
    },
    [interviewId]
  );

  const requestFullscreen = async () => {
    const el: any = document.documentElement;
    try {
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
      }
      await sendEvent(interviewId, 'FULLSCREEN_ENTER');
      setState((prev) => ({ ...prev, fullscreen: true }));
      setStarted(true);
    } catch (e: any) {
      console.error('fullscreen request failed', e);
      await sendEvent(interviewId, 'FULLSCREEN_FAIL', { error: e.message });
      alert(
        'We need fullscreen permission to start the interview. Please allow it and try again.'
      );
    }
  };

  // Listeners
  useEffect(() => {
    if (!started) return;

    const handleVisibility = () => {
      const hidden = document.hidden;
      setState((prev) => ({ ...prev, focused: !hidden }));
      if (hidden) {
        incrementViolation('TAB_OR_WINDOW_SWITCH');
      }
    };

    const handleBlur = () => {
      setState((prev) => ({ ...prev, focused: false }));
      incrementViolation('WINDOW_BLUR');
    };

    const handleFocus = () => {
      setState((prev) => ({ ...prev, focused: true }));
    };

    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setState((prev) => ({ ...prev, fullscreen: fs }));
      if (!fs) {
        incrementViolation('FULLSCREEN_EXIT');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Best-effort: block some shortcuts
      const combo = [
        e.ctrlKey ? 'Ctrl' : '',
        e.metaKey ? 'Meta' : '',
        e.altKey ? 'Alt' : '',
        e.key,
      ]
        .filter(Boolean)
        .join('+');

      const bannedCombos = ['Ctrl+L', 'Meta+L', 'Alt+Tab', 'Meta+Tab'];
      if (bannedCombos.includes(combo) || e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        incrementViolation('KEYBOARD_SHORTCUT');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown, true);

    sendEvent(interviewId, 'PROCTOR_STARTED', { ua: navigator.userAgent });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [started, incrementViolation, interviewId]);

  // Warn on attempts to close/refresh
  useEffect(() => {
    if (!started) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [started]);

  // UI

  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 w-screen">
        <div className="max-w-md border border-slate-800 rounded-xl p-6 bg-slate-900 shadow-lg">
          <h1 className="text-lg font-semibold mb-2">Proctored Interview</h1>
          <p className="text-sm text-slate-300 mb-4">
            This interview will run in fullscreen and your activity will be
            monitored. Switching tabs, exiting fullscreen, or using shortcuts
            may lock the interview.
          </p>
          <ul className="text-xs text-slate-400 mb-4 list-disc pl-4 space-y-1">
            <li>Do not switch tabs or windows.</li>
            <li>Do not exit fullscreen mode.</li>
            <li>Do not refresh or close this page.</li>
          </ul>
          <button
            onClick={requestFullscreen}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium"
          >
            I understand, start interview
          </button>
        </div>
      </div>
    );
  }

  const showOverlay = state.locked || !state.fullscreen || !state.focused;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* main content */}
      <div className={showOverlay ? 'pointer-events-none blur-sm' : ''}>
        {children}
      </div>

      {/* overlay when not fullscreen / not focused / locked */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-center px-4">
          <h2 className="text-xl font-semibold mb-2">
            {state.locked ? 'Interview Locked' : 'Return to the Interview'}
          </h2>
          {!state.locked && (
            <>
              <p className="text-sm text-slate-300 mb-4 max-w-md">
                The interview requires your full attention in fullscreen mode.
                Please return to this tab and re-enter fullscreen to continue.
              </p>
              <button
                className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium"
                onClick={requestFullscreen}
              >
                Re-enter fullscreen
              </button>
            </>
          )}
          {state.locked && (
            <p className="text-sm text-red-300 max-w-md">
              This interview has been locked due to multiple proctoring
              violations. Please contact the administrator.
            </p>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Violations: {state.violationCount} / {MAX_VIOLATIONS}
          </p>
        </div>
      )}
    </div>
  );
};
