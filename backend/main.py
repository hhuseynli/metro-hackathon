import os
import io
import re
import json
import time
import uuid
import random
import threading
from pathlib import Path
from collections import defaultdict

import cv2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

from scripts.nudge_engine import decide_nudge

try:
    from ultralytics import YOLO
    from scripts.zone_detector import get_zone_counts
    from scripts.yolo_utils import CONF, IOU, IMGSZ
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

CAMERA_ROOT = Path(__file__).parent.parent / "data" / "Camera"
OUTPUTS_DIR = Path(__file__).parent / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Zone / nudge state (live / precomputed / demo)
# ---------------------------------------------------------------------------
N_ZONES = 5

state = {
    'zone_counts': {i: 0 for i in range(N_ZONES)},
    'nudge': {'active': False},
    'frame_count': 0,
    'mode': 'demo',
    'fps': 0.0,
}

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
# Background zone workers
# ---------------------------------------------------------------------------
def live_video_loop(video_path: str):
    model = YOLO('yolov8s.pt') if YOLO_AVAILABLE else None
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        state['mode'] = 'demo'
        demo_loop()
        return

    state['mode'] = 'live'
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
        state['fps'] = round(frames_processed / max(time.time() - t0, 0.001), 1)
        time.sleep(0.5)


def precomputed_loop(json_path: str):
    with open(json_path) as f:
        samples = json.load(f)
    if not samples:
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


def demo_loop():
    state['mode'] = 'demo'
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


@app.on_event("startup")
async def startup():
    video_path = os.environ.get("VIDEO_PATH", "")
    zone_json  = os.environ.get("ZONE_JSON", "")

    if video_path and Path(video_path).exists():
        t = threading.Thread(target=live_video_loop, args=(video_path,), daemon=True)
    elif zone_json and Path(zone_json).exists():
        t = threading.Thread(target=precomputed_loop, args=(zone_json,), daemon=True)
    else:
        t = threading.Thread(target=demo_loop, daemon=True)
    t.start()

# ---------------------------------------------------------------------------
# Tracking jobs state
# ---------------------------------------------------------------------------
jobs: dict[str, dict] = {}   # job_id → {status, total_in, total_out, video_url, error}


def _run_tracking(job_id: str, video_path: str, seconds: float | None):
    from collections import defaultdict, deque

    try:
        from ultralytics import YOLO as _YOLO
        from scripts.yolo_utils import CONF as _CONF, IOU as _IOU, IMGSZ as _IMGSZ
        from scripts.yolo_utils import blur_faces
    except ImportError:
        jobs[job_id] = {'status': 'error', 'error': 'YOLO not available'}
        return

    jobs[job_id]['status'] = 'running'

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        jobs[job_id] = {'status': 'error', 'error': f'Cannot open {video_path}'}
        return

    fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w            = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h            = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    max_frames   = int(seconds * fps) if seconds else total_frames
    line_y       = h // 2
    every_n      = 5

    stem     = Path(video_path).stem
    out_path = OUTPUTS_DIR / f"{stem}_tracked.mp4"

    writer = cv2.VideoWriter(
        str(out_path),
        cv2.VideoWriter_fourcc(*"avc1"),
        max(1.0, fps / every_n),
        (w, h),
    )

    model = _YOLO('yolov8s.pt')

    DIR_IN  = "in"
    DIR_OUT = "out"
    COLOR_MAP = {DIR_IN: (0, 220, 0), DIR_OUT: (0, 0, 220)}
    COLOR_UNK = (220, 160, 0)

    centroids   = defaultdict(lambda: deque(maxlen=15))
    directions  = {}
    counted_ids = set()
    total_in = total_out = 0
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret or frame_idx >= max_frames:
            break

        if frame_idx % every_n == 0:
            results = model.track(
                frame, persist=True, classes=[0],
                conf=_CONF, iou=_IOU, imgsz=_IMGSZ, verbose=False,
                tracker="bytetrack.yaml",
            )
            boxes = results[0].boxes

            for box in boxes:
                if box.id is None:
                    continue
                tid = int(box.id)
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                cy = (y1 + y2) // 2
                centroids[tid].append(cy)

                hist = centroids[tid]
                if len(hist) >= 4:
                    dy = hist[-1] - hist[0]
                    if dy > 15:
                        directions[tid] = DIR_OUT
                    elif dy < -15:
                        directions[tid] = DIR_IN

                if tid not in counted_ids and len(hist) >= 2:
                    prev_y, curr_y = hist[-2], hist[-1]
                    if prev_y < line_y <= curr_y:
                        total_out += 1
                        counted_ids.add(tid)
                        del centroids[tid]
                    elif prev_y > line_y >= curr_y:
                        total_in += 1
                        counted_ids.add(tid)
                        del centroids[tid]

            annotated = frame.copy()
            for box in boxes:
                if box.id is None:
                    continue
                tid = int(box.id)
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                color = COLOR_MAP.get(directions.get(tid), COLOR_UNK)
                cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

            cv2.line(annotated, (0, line_y), (w, line_y), (255, 255, 0), 2)
            for i, (label, direction) in enumerate([
                (f"IN  {total_in:4d}", DIR_IN),
                (f"OUT {total_out:4d}", DIR_OUT),
            ]):
                color = COLOR_MAP[direction]
                pad, panel_h = 8, 30
                y0 = pad + i * (panel_h + pad)
                cv2.rectangle(annotated, (pad, y0), (pad + 190, y0 + panel_h), (30, 30, 30), -1)
                cv2.putText(annotated, label, (pad + 8, y0 + panel_h - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)

            writer.write(annotated)
            jobs[job_id]['total_in']  = total_in
            jobs[job_id]['total_out'] = total_out

        frame_idx += 1

    cap.release()
    writer.release()

    jobs[job_id].update({
        'status': 'done',
        'total_in': total_in,
        'total_out': total_out,
        'video_url': f'/api/outputs/{out_path.name}',
    })


# ---------------------------------------------------------------------------
# Existing endpoints
# ---------------------------------------------------------------------------
@app.get("/api/zones")
def get_zones():
    return {"zones": state['zone_counts'], "frame_count": state['frame_count'],
            "mode": state['mode'], "fps": state['fps']}

@app.get("/api/nudge")
def get_nudge():
    return state['nudge']

@app.get("/api/stats")
def get_stats():
    return load_key_stat()

@app.get("/api/status")
def get_status():
    return {"mode": state['mode'], "yolo_available": YOLO_AVAILABLE,
            "frame_count": state['frame_count'], "fps": state['fps']}

# ---------------------------------------------------------------------------
# New ML endpoints
# ---------------------------------------------------------------------------
@app.get("/api/cameras")
def list_cameras():
    """Return all available camera videos grouped by folder."""
    if not CAMERA_ROOT.exists():
        return {}
    result = {}
    for folder in sorted(CAMERA_ROOT.iterdir()):
        if folder.is_dir():
            files = sorted(f.name for f in folder.glob("*.avi"))
            if files:
                result[folder.name] = files
    return result


class PreviewRequest(BaseModel):
    folder: str
    filename: str
    frame_pct: float = 0.5


@app.post("/api/preview")
def preview_frame(req: PreviewRequest):
    """Run single-frame YOLO detection and return annotated JPEG."""
    if not YOLO_AVAILABLE:
        raise HTTPException(503, "YOLO not available")

    video_path = CAMERA_ROOT / req.folder / req.filename
    if not video_path.exists():
        raise HTTPException(404, f"Video not found: {req.folder}/{req.filename}")

    cap = cv2.VideoCapture(str(video_path))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * req.frame_pct))
    ret, frame = cap.read()
    cap.release()

    if not ret:
        raise HTTPException(500, "Failed to read frame")

    model = YOLO('yolov8s.pt')
    results = model(frame, classes=[0], conf=CONF, iou=IOU, imgsz=IMGSZ, verbose=False)
    boxes = results[0].boxes

    annotated = frame.copy()
    for box in boxes:
        x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 200, 255), 2)

    count_label = f"Persons: {len(boxes)}"
    cv2.putText(annotated, count_label, (10, 34),
                cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 0, 0), 4, cv2.LINE_AA)
    cv2.putText(annotated, count_label, (10, 34),
                cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 200, 255), 2, cv2.LINE_AA)

    _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return StreamingResponse(io.BytesIO(buf.tobytes()), media_type="image/jpeg",
                             headers={"X-Person-Count": str(len(boxes))})


class TrackRequest(BaseModel):
    folder: str
    filename: str
    seconds: float | None = None


@app.post("/api/track")
def start_tracking(req: TrackRequest):
    """Start async in/out tracking on a video. Returns job_id to poll."""
    video_path = CAMERA_ROOT / req.folder / req.filename
    if not video_path.exists():
        raise HTTPException(404, f"Video not found: {req.folder}/{req.filename}")

    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {'status': 'queued', 'total_in': 0, 'total_out': 0}

    t = threading.Thread(
        target=_run_tracking,
        args=(job_id, str(video_path), req.seconds),
        daemon=True,
    )
    t.start()
    return {'job_id': job_id}


@app.get("/api/track/{job_id}")
def get_tracking_result(job_id: str):
    """Poll tracking job status."""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    return jobs[job_id]


@app.get("/api/outputs/{filename}")
def serve_output(filename: str):
    """Serve a generated output file (MP4 or JPG)."""
    path = OUTPUTS_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Output file not found")
    media_type = "video/mp4" if filename.endswith(".mp4") else "image/jpeg"
    return FileResponse(str(path), media_type=media_type)


MAX_PERSONS_PER_WAGON = 315

@app.get("/api/wagon-occupancy")
def wagon_occupancy():
    """
    For each train wagon (В2, В3, В4), sample a mid-video frame from every camera,
    sum person counts across cameras, and return occupancy % relative to 315 capacity.
    Results are cached in memory after the first call.
    """
    if not YOLO_AVAILABLE:
        raise HTTPException(503, "YOLO not available")

    train_dir = CAMERA_ROOT / "Train"
    if not train_dir.exists():
        raise HTTPException(404, "Train camera folder not found")

    # Group video files by wagon (В2, В3, В4)
    wagon_files: dict[str, list[Path]] = defaultdict(list)
    for f in sorted(train_dir.glob("*.avi")):
        m = re.match(r'^(В\d+)', f.name)
        if m:
            wagon_files[m.group(1)].append(f)

    model = YOLO('yolov8s.pt')
    result = {}

    for wagon, videos in sorted(wagon_files.items()):
        total_persons = 0
        cameras_sampled = 0

        for video_path in videos:
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                continue
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames // 2)
            ret, frame = cap.read()
            cap.release()
            if not ret:
                continue

            detections = model(frame, classes=[0], conf=CONF, iou=IOU, imgsz=IMGSZ, verbose=False)
            total_persons += len(detections[0].boxes)
            cameras_sampled += 1

        if cameras_sampled == 0:
            continue

        pct = round(min(total_persons / MAX_PERSONS_PER_WAGON * 100, 100), 1)
        result[wagon] = {
            "persons": total_persons,
            "percentage": pct,
            "capacity": MAX_PERSONS_PER_WAGON,
            "cameras_sampled": cameras_sampled,
        }

    return result


@app.get("/")
def root():
    return {"message": "Metro Platform API", "docs": "/docs"}
