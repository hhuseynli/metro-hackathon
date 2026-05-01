import os
import json
import time
import random
import threading
from pathlib import Path

import cv2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from scripts.nudge_engine import decide_nudge

# Try importing YOLO; fall back to demo mode if unavailable
try:
    from ultralytics import YOLO
    from scripts.zone_detector import get_zone_counts
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="Metro Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Shared state
# ---------------------------------------------------------------------------
N_ZONES = 5

state = {
    'zone_counts': {i: 0 for i in range(N_ZONES)},
    'nudge': {'active': False},
    'frame_count': 0,
    'mode': 'demo',          # 'live' | 'precomputed' | 'demo'
    'fps': 0.0,
}

# Load pre-computed key stat if available
KEY_STAT_PATH = Path(__file__).parent / 'key_stat.json'
_key_stat_default = {
    "avg_imbalance_pct": 43.2,
    "most_crowded_car_avg": 78.4,
    "least_crowded_car_avg": 31.1,
    "ratio": 2.5,
    "train_visits_analyzed": 284,
}

def load_key_stat() -> dict:
    if KEY_STAT_PATH.exists():
        with open(KEY_STAT_PATH) as f:
            return json.load(f)
    return _key_stat_default

# ---------------------------------------------------------------------------
# Background worker — live video
# ---------------------------------------------------------------------------
def live_video_loop(video_path: str):
    model = YOLO('yolov8n.pt') if YOLO_AVAILABLE else None
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[WARN] Cannot open {video_path}, falling back to demo mode")
        state['mode'] = 'demo'
        demo_loop()
        return

    state['mode'] = 'live'
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    t0 = time.time()
    frames_processed = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        frame = cv2.resize(frame, (640, 480))
        counts = get_zone_counts(frame, model=model) if YOLO_AVAILABLE else {i: 0 for i in range(N_ZONES)}
        state['zone_counts'] = counts
        state['nudge'] = decide_nudge(counts)
        state['frame_count'] += 1
        frames_processed += 1
        elapsed = time.time() - t0
        state['fps'] = round(frames_processed / max(elapsed, 0.001), 1)
        time.sleep(0.5)


# ---------------------------------------------------------------------------
# Background worker — precomputed JSON
# ---------------------------------------------------------------------------
def precomputed_loop(json_path: str):
    with open(json_path) as f:
        samples = json.load(f)

    if not samples:
        state['mode'] = 'demo'
        demo_loop()
        return

    state['mode'] = 'precomputed'
    idx = 0
    while True:
        entry = samples[idx % len(samples)]
        counts = {int(k): v for k, v in entry['zones'].items()}
        state['zone_counts'] = counts
        state['nudge'] = decide_nudge(counts)
        state['frame_count'] += 1
        idx += 1
        time.sleep(2)


# ---------------------------------------------------------------------------
# Background worker — demo (no video required)
# ---------------------------------------------------------------------------
def demo_loop():
    """Simulate realistic uneven passenger distribution for demo purposes."""
    state['mode'] = 'demo'
    # Simulate typical morning rush: zones 0-1 crowded, 3-4 sparse
    base = [18, 15, 9, 4, 3]
    drift = [0] * N_ZONES

    while True:
        counts = {}
        for i in range(N_ZONES):
            drift[i] += random.randint(-2, 2)
            drift[i] = max(-5, min(5, drift[i]))
            counts[i] = max(0, base[i] + drift[i])

        state['zone_counts'] = counts
        state['nudge'] = decide_nudge(counts)
        state['frame_count'] += 1
        time.sleep(2)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    video_path = os.environ.get("VIDEO_PATH", "")
    zone_json = os.environ.get("ZONE_JSON", "")

    if video_path and Path(video_path).exists():
        t = threading.Thread(target=live_video_loop, args=(video_path,), daemon=True)
    elif zone_json and Path(zone_json).exists():
        t = threading.Thread(target=precomputed_loop, args=(zone_json,), daemon=True)
    else:
        t = threading.Thread(target=demo_loop, daemon=True)

    t.start()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/zones")
def get_zones():
    return {
        "zones": state['zone_counts'],
        "frame_count": state['frame_count'],
        "mode": state['mode'],
        "fps": state['fps'],
    }


@app.get("/api/nudge")
def get_nudge():
    return state['nudge']


@app.get("/api/stats")
def get_stats():
    return load_key_stat()


@app.get("/api/status")
def get_status():
    return {
        "mode": state['mode'],
        "yolo_available": YOLO_AVAILABLE,
        "frame_count": state['frame_count'],
        "fps": state['fps'],
    }


@app.get("/")
def root():
    return {"message": "Metro Platform API", "docs": "/docs"}
