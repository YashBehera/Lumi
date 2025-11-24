from typing import Dict, Any

def compute_suspicion(
  current_suspicion: int,
  metrics: Dict[str, Any],
  llm_analysis: Dict[str, Any]
) -> int:
  """
  Combine audio metrics + AI-likeness into a suspicion score (0–100+).
  Very simple heuristic to start.
  """

  wpm = metrics["wpm"]
  ttr = metrics["ttr"]
  filler_count = metrics["filler_count"]
  ai_like = llm_analysis["ai_likeness_score"]

  suspicion = current_suspicion

  # WPM suspicious if extremely low or extremely high
  if wpm < 60 or wpm > 200:
    suspicion += 5

  # Very low fillers & super high TTR can be suspicious (too perfect)
  if filler_count == 0 and ttr > 0.6 and metrics["total_words"] > 40:
    suspicion += 10

  # AI-likeness directly adds
  suspicion += int(ai_like * 2)  # 0-10 -> 0-20

  # Clip to some max
  suspicion = max(0, min(suspicion, 100))
  return suspicion
