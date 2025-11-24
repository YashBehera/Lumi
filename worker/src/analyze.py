from typing import Dict, Any
import re
import math
import json
import importlib

try:
    ollama = importlib.import_module('ollama')
except Exception:
    ollama = None

from .config import OLLAMA_MODEL

FILLERS = ["um", "uh", "you know", "like", "so", "I mean"]

def compute_metrics(transcript: str, duration_sec: float) -> Dict[str, Any]:
  text = transcript.lower()
  tokens = re.findall(r"\b\w+\b", text)
  total_words = len(tokens)
  wpm = (total_words / duration_sec) * 60 if duration_sec > 0 else 0

  # filler count (simple)
  filler_count = 0
  for f in FILLERS:
    filler_count += text.count(f)

  unique_words = len(set(tokens)) if tokens else 0
  ttr = unique_words / total_words if total_words > 0 else 0.0

  return {
    "total_words": total_words,
    "wpm": wpm,
    "filler_count": filler_count,
    "unique_words": unique_words,
    "ttr": ttr,
    "duration_sec": duration_sec,
  }

def analyze_with_llm(question: str, transcript: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Uses local Ollama model to rate fluency & AI-likeness.
    If `ollama` isn't installed or available, returns neutral defaults.
    """
    metrics_json = json.dumps(metrics)

    prompt = f"""
You are an HR communication assessor and AI-detection assistant.

Question asked:
{question}

Candidate's spoken answer (ASR transcript):
'''{transcript}'''

Numeric features (JSON):
{metrics_json}

Tasks:
1) Rate spoken fluency from 0 to 10 (integer) based on pace, smoothness, and clarity.
2) Rate how likely this answer is AI-generated or read from a script from 0 to 10 (integer).
3) Give very short feedback on speaking style and naturalness (max 60 words).

Return ONLY valid JSON in this exact structure:
{{
  "fluency_score": 0,
  "ai_likeness_score": 0,
  "feedback": "..."
}}
"""

    if not ollama:
        print("[analyze] Ollama not available, returning defaults.")
        return {
            "fluency_score": 5,
            "ai_likeness_score": 5,
            "feedback": "LLM unavailable in worker environment; using neutral defaults.",
        }

    print("[analyze] Calling Ollama...")
    res = ollama.chat(
        model=OLLAMA_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    content = res["message"]["content"].strip()
    print("[analyze] Raw model output:", content)

    # Try to extract JSON block
    first = content.find("{")
    last = content.rfind("}")
    if first != -1 and last != -1:
        content = content[first:last+1]

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        print("[analyze] JSON parse failed, using fallback.")
        data = {
            "fluency_score": 5,
            "ai_likeness_score": 5,
            "feedback": "Unable to parse model output cleanly; using neutral defaults."
        }

    # Ensure keys exist and are ints
    data["fluency_score"] = int(data.get("fluency_score", 5))
    data["ai_likeness_score"] = int(data.get("ai_likeness_score", 5))
    data["feedback"] = data.get("feedback", "")

    return data
