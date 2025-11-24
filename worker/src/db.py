import sqlite3
from typing import List, Dict, Any
from .config import DB_PATH

def get_conn():
  conn = sqlite3.connect(DB_PATH)
  conn.row_factory = sqlite3.Row
  return conn

def fetch_unprocessed_audio(limit: int = 5) -> List[sqlite3.Row]:
  conn = get_conn()
  cur = conn.cursor()
  cur.execute(
    """
    SELECT mr.*, i.suspicionScore as currentSuspicion
    FROM MediaRecord mr
    JOIN Interview i ON i.id = mr.interviewId
    WHERE mr.type = 'audio' AND mr.processed = 0
    ORDER BY mr.createdAt ASC
    LIMIT ?
    """,
    (limit,)
  )
  rows = cur.fetchall()
  conn.close()
  return rows

def update_media_record(id: str, transcript: str, duration_sec: float, analysis_json: str):
  conn = get_conn()
  cur = conn.cursor()
  cur.execute(
    """
    UPDATE MediaRecord
    SET transcript = ?, durationSec = ?, analysisJson = ?, processed = 1
    WHERE id = ?
    """,
    (transcript, duration_sec, analysis_json, id)
  )
  conn.commit()
  conn.close()

def update_interview_suspicion(interview_id: str, new_score: int):
  conn = get_conn()
  cur = conn.cursor()
  cur.execute(
    "UPDATE Interview SET suspicionScore = ? WHERE id = ?",
    (new_score, interview_id)
  )
  conn.commit()
  conn.close()
