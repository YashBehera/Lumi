import time
import json

from .db import (
  fetch_unprocessed_audio,
  update_media_record,
  update_interview_suspicion,
)
from .transcribe import transcribe_audio
from .analyze import compute_metrics, analyze_with_llm
from .suspicion import compute_suspicion

# 👇 NEW: import YOLO batch processor
from .yolo_worker import process_yolo_batch

# For now, use a dummy question text.
# Later, pull actual question per audio from your DB (e.g., Response table).
DEFAULT_QUESTION = "Tell me about yourself."


def process_audio_once():
  """
  One pass over unprocessed audio records:
  - transcribe
  - compute metrics
  - run LLM analysis
  - compute suspicion
  - persist back to DB
  """
  records = fetch_unprocessed_audio(limit=5)
  if not records:
    print("No unprocessed audio found.")
    return

  for r in records:
    media_id = r["id"]
    interview_id = r["interviewId"]
    path = r["path"]
    current_suspicion = r["currentSuspicion"] or 0

    print(f"[AUDIO] Processing MediaRecord {media_id} for interview {interview_id}")

    # 1) Transcribe
    transcript, duration_sec = transcribe_audio(path)
    print("[AUDIO] Transcript:", transcript[:80], "...")

    # 2) Metrics
    metrics = compute_metrics(transcript, duration_sec)
    print("[AUDIO] Metrics:", metrics)

    # 3) LLM analysis
    llm_analysis = analyze_with_llm(DEFAULT_QUESTION, transcript, metrics)
    print("[AUDIO] LLM:", llm_analysis)

    # 4) Suspicion score
    new_suspicion = compute_suspicion(current_suspicion, metrics, llm_analysis)
    print("[AUDIO] New suspicion score:", new_suspicion)

    # 5) Persist results
    analysis_payload = {
      "metrics": metrics,
      "llm": llm_analysis,
      "computedSuspicion": new_suspicion,
      "version": 1,
    }
    update_media_record(
      media_id,
      transcript,
      duration_sec,
      json.dumps(analysis_payload),
    )
    update_interview_suspicion(interview_id, new_suspicion)


def process_once():
  """
  Single combined worker tick:
  - process audio
  - process YOLO video chunks
  """
  # 1) audio answers
  process_audio_once()

  # 2) YOLO on webcam video chunks
  try:
    process_yolo_batch()
  except Exception as e:
    print("[YOLO] Error while processing YOLO batch:", e)


def main_loop():
  print("Worker started. Watching for:")
  print("- new audio answers (transcription + LLM + suspicion)")
  print("- new video chunks (YOLO object detection)")

  while True:
    try:
      process_once()
    except Exception as e:
      print("Error in processing loop:", e)
    time.sleep(5)  # poll every 5 seconds


if __name__ == "__main__":
  main_loop()
