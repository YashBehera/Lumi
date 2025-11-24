import os
import time
import json
from pathlib import Path

import cv2
import requests
from ultralytics import YOLO

API_BASE = os.getenv("API_BASE", "http://localhost:4000")
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", "../backend")).resolve()

# Load YOLO model (small one to keep it light)
model = YOLO("yolov8n.pt")  # will download on first run

# Classes we care about
TARGET_CLASSES = {
    "person",
    "cell phone",
    "laptop",
    "book",
    "tv",
}

# Map class IDs to names based on model.names
def get_class_name(model, cls_id):
    names = model.names
    return names.get(int(cls_id), str(cls_id))


def get_pending_media(limit=5):
    resp = requests.get(f"{API_BASE}/api/worker/yolo/pending", params={"limit": limit})
    resp.raise_for_status()
    return resp.json()


def post_result(media_id, summary, events):
    resp = requests.post(
        f"{API_BASE}/api/worker/yolo/result/{media_id}",
        json={"summary": summary, "events": events},
    )
    resp.raise_for_status()


def process_video(media):
    media_id = media["id"]
    interview_id = media["interviewId"]
    rel_path = media["path"]

    # Backend stored relative path; convert to actual file path
    video_path = MEDIA_ROOT / rel_path

    print(f"[YOLO] Processing media {media_id} ({video_path})")

    # 🔴 If file is missing, mark as processed with a special event so we don't loop forever
    if not video_path.exists():
        print(f"[YOLO] Video file not found: {video_path}")

        summary = {
            "missingFile": True,
            "path": str(video_path),
        }
        events = [
            {
                "type": "yolo_video_missing",
                "payload": {
                    "level": "info",
                    "message": "Video file for this chunk was missing on the server, YOLO could not analyze it.",
                    "summary": summary,
                },
            }
        ]

        # This will set yoloProcessed = true in backend
        try:
            post_result(media_id, summary, events)
        except Exception as e:
            print(f"[YOLO] Failed to post missing-file result for {media_id}: {e}")
        return

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[YOLO] Failed to open video: {video_path}")

        summary = {
            "openError": True,
            "path": str(video_path),
        }
        events = [
            {
                "type": "yolo_video_open_failed",
                "payload": {
                    "level": "info",
                    "message": "Video file for this chunk could not be opened by YOLO.",
                    "summary": summary,
                },
            }
        ]
        try:
            post_result(media_id, summary, events)
        except Exception as e:
            print(f"[YOLO] Failed to post open-failed result for {media_id}: {e}")
        return

    frame_count = 0
    processed_frames = 0

    total_person_frames = 0
    total_multi_person_frames = 0
    total_phone_frames = 0
    total_forbidden_frames = 0

    # We'll sample every Nth frame to keep cost low
    SAMPLE_EVERY = 10  # process 1 out of 10 frames

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1

        if frame_count % SAMPLE_EVERY != 0:
            continue

        processed_frames += 1

        # Run YOLO on this frame
        results = model(frame, verbose=False)[0]

        # Count objects
        person_count = 0
        has_phone = False
        has_forbidden = False

        for box in results.boxes:
            cls_id = int(box.cls[0].item())
            cls_name = get_class_name(model, cls_id)

            if cls_name not in TARGET_CLASSES:
                continue

            if cls_name == "person":
                person_count += 1
            elif cls_name == "cell phone":
                has_phone = True
                has_forbidden = True
            elif cls_name in ("book", "tv", "laptop"):
                has_forbidden = True
            # you can refine rules as needed

        if person_count > 0:
            total_person_frames += 1
        if person_count > 1:
            total_multi_person_frames += 1
            has_forbidden = True

        if has_phone:
            total_phone_frames += 1

        if has_forbidden:
            total_forbidden_frames += 1

    cap.release()

    if processed_frames == 0:
        print(f"[YOLO] No frames processed for media {media_id}")
        summary = {
            "processedFrames": 0,
            "note": "No frames readable from video file.",
            "path": str(video_path),
        }
        events = [
            {
                "type": "yolo_no_frames",
                "payload": {
                    "level": "info",
                    "message": "Video file had no readable frames for YOLO.",
                    "summary": summary,
                },
            }
        ]
        try:
            post_result(media_id, summary, events)
        except Exception as e:
            print(f"[YOLO] Failed to post no-frames result for {media_id}: {e}")
        return

    # Build summary
    summary = {
        "processedFrames": processed_frames,
        "personFrames": total_person_frames,
        "multiPersonFrames": total_multi_person_frames,
        "phoneFrames": total_phone_frames,
        "forbiddenFrames": total_forbidden_frames,
        "ratios": {
            "multiPersonRatio": total_multi_person_frames / processed_frames,
            "phoneRatio": total_phone_frames / processed_frames,
            "forbiddenRatio": total_forbidden_frames / processed_frames,
        },
    }

    events = []

    # Multiple people
    if summary["ratios"]["multiPersonRatio"] > 0.1:
        events.append({
            "type": "yolo_multiple_people_detected",
            "payload": {
                "level": "warning",
                "message": "We detected more than one person in the camera frame.",
                "summary": summary,
            },
        })

    # Phone visible
    if summary["ratios"]["phoneRatio"] > 0.05:
        events.append({
            "type": "yolo_phone_detected",
            "payload": {
                "level": "warning",
                "message": "We detected a mobile phone in the camera frame.",
                "summary": summary,
            },
        })

    # Other forbidden objects / general issue
    if summary["ratios"]["forbiddenRatio"] > 0.1:
        events.append({
            "type": "yolo_forbidden_objects_detected",
            "payload": {
                "level": "warning",
                "message": "We detected external objects or multiple people in the camera frame.",
                "summary": summary,
            },
        })

    print(f"[YOLO] Summary for media {media_id}: {json.dumps(summary, indent=2)}")

    # Send to backend -> marks yoloProcessed = true
    post_result(media_id, summary, events)


def process_yolo_batch(limit: int = 5):
    """
    Process up to `limit` pending video media records once.
    Called from main.py in each loop.
    """
    pending = get_pending_media(limit=limit)
    if not pending:
        print("[YOLO] No pending video media found.")
        return

    for media in pending:
        try:
            process_video(media)
        except Exception as e:
            print(f"[YOLO] Error processing media {media['id']}: {e}")


# NOTE: we no longer use main_loop here when run via src.main;
# this block is only for running yolo_worker standalone.
def main_loop():
    while True:
        try:
            pending = get_pending_media(limit=5)
            if not pending:
                time.sleep(5)
                continue

            for media in pending:
                try:
                    process_video(media)
                except Exception as e:
                    print(f"[YOLO] Error processing {media['id']}: {e}")
        except Exception as e:
            print("[YOLO] Worker error:", e)
            time.sleep(5)


if __name__ == "__main__":
    print("[YOLO] Worker started")
    main_loop()
