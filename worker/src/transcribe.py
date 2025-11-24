from typing import Tuple
from .config import UPLOAD_DIR
import os
import importlib

try:
    fw = importlib.import_module('faster_whisper')
    WhisperModel = getattr(fw, 'WhisperModel', None)
except Exception:
    WhisperModel = None

# load model once (use a stub if the library isn't available)
if WhisperModel is not None:
    try:
        model = WhisperModel("small", device="cpu", compute_type="int8")  # adjust if you have GPU
    except Exception:
        # if model initialization fails, fall back to stub
        WhisperModel = None

if WhisperModel is None:
    class _StubModel:
        def transcribe(self, path: str, beam_size: int = 5):
            # Return empty segments and an info-like object with duration 0.0
            class _Info:
                duration = 0.0
            return [], _Info()

    model = _StubModel()


def transcribe_audio(rel_path: str) -> Tuple[str, float]:
    """
    rel_path: path stored in DB (relative to backend root)
    returns: (transcript_text, duration_seconds)
    """
    audio_path = os.path.join(UPLOAD_DIR, os.path.basename(rel_path))
    # If path stored already absolute, skip join.
    if not os.path.exists(audio_path):
        # fallback: maybe path is already absolute
        audio_path = rel_path

    segments, info = model.transcribe(audio_path, beam_size=5)
    text_parts = []
    last_end = 0.0
    for seg in segments:
        # Some transcribe segment objects may have 'text' and 'end' attributes
        txt = getattr(seg, 'text', '')
        end = getattr(seg, 'end', None)
        if txt:
            text_parts.append(txt.strip())
        if end is not None:
            try:
                last_end = max(last_end, float(end))
            except Exception:
                pass

    transcript = " ".join(text_parts).strip()
    duration_sec = last_end or getattr(info, 'duration', 0.0)

    return transcript, float(duration_sec)
