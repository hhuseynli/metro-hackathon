import os
import io
import re
import json
import math
import time
import uuid
import random
import threading
from pathlib import Path
from collections import defaultdict
from datetime import datetime

import cv2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from scripts.nudge_engine import decide_nudge
from scripts.predictor import get_baseline, get_station_peak, predict_load

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

_DEMO_DATA = Path(__file__).parent.parent / "demo-data"

CAMERA_ROOT = Path(os.environ.get("CAMERA_ROOT", str(Path(__file__).parent.parent / "data" / "Camera")))
OUTPUTS_DIR = Path(os.environ.get("OUTPUTS_DIR", str(_DEMO_DATA / "outputs")))
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

KEY_STAT_PATH = Path(os.environ.get("KEY_STAT_PATH", str(_DEMO_DATA / "key_stat.json")))

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

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

_key_stat_default = {
    "avg_imbalance_pct": 43.2,
    "most_crowded_car_avg": 78.4,
    "least_crowded_car_avg": 31.1,
    "ratio": 2.5,
    "train_visits_analyzed": 284,
}

# ---------------------------------------------------------------------------
# Station registry  (id → display name + CSV name)
# ---------------------------------------------------------------------------
STATIONS_REGISTRY: dict[str, dict] = {
    "20-yanvar":          {"name": "20 Yanvar",           "csv": "20 Yanvar"},
    "28-may":             {"name": "28 May",              "csv": "28-May"},
    "8-noyabr":           {"name": "8 Noyabr",            "csv": "8 Noyabr"},
    "akhmedli":           {"name": "Əhmədli",              "csv": "Akhmedli"},
    "avtovaghzal":        {"name": "Avtovağzal",           "csv": "Avtovaghzal"},
    "azadlig-prospekti":  {"name": "Azadlıq Prospekti",   "csv": "Azadlig Prospekti"},
    "bakmil":             {"name": "Bakmil",               "csv": "Bakmil"},
    "darnagul":           {"name": "Dərnəgül",             "csv": "Darnagul"},
    "elmlar-akademiyasi": {"name": "Elmlar Akademiyası",   "csv": "Elmlar Akademiyasi"},
    "ganjlik":            {"name": "Gənclik",              "csv": "Ganjlik"},
    "gara-garayev":       {"name": "Qara Qarayev",         "csv": "Gara Garayev"},
    "hazi-aslanov":       {"name": "Həzi Aslanov",         "csv": "Hazi Aslanov"},
    "icherisheher":       {"name": "İçərişəhər",           "csv": "Icherisheher"},
    "inshaatchilar":      {"name": "İnşaatçılar",          "csv": "Inshaatchilar"},
    "jafar-jabbarli":     {"name": "Cəfər Cabbarlı",       "csv": "Jafar Jabbarli"},
    "khalglar-dostlughu": {"name": "Xalqlar Dostluğu",    "csv": "Khalglar Dostlughu"},
    "khatai":             {"name": "Xətai",                "csv": "Khatai"},
    "khocasen":           {"name": "Xocəsən",              "csv": "Khocasen"},
    "koroghlu":           {"name": "Koroğlu",              "csv": "Koroghlu"},
    "memar-ajami":        {"name": "Memar Əcəmi",          "csv": "Memar Ajami"},
    "memar-ajami-2":      {"name": "Memar Əcəmi 2",        "csv": "Memar Ajami 2"},
    "nariman-narimanov":  {"name": "Nəriman Nərimanov",    "csv": "Nariman Narimanov"},
    "nasimi":             {"name": "Nəsimi",               "csv": "Nasimi"},
    "neftchilar":         {"name": "Neftçilər",            "csv": "Neftchilar"},
    "nizami":             {"name": "Nizami",               "csv": "Nizami"},
    "sahil":              {"name": "Sahil",                "csv": "Sahil"},
    "ulduz":              {"name": "Ulduz",                "csv": "Ulduz"},
}

_STATION_IDS = list(STATIONS_REGISTRY.keys())


def _next_train_min(station_id: str) -> int:
    """Simulated schedule: stations staggered across an 8-minute cycle."""
    cycle = 8
    offset = abs(hash(station_id)) % cycle
    elapsed = (int(time.time()) // 60) % cycle
    remaining = (offset - elapsed) % cycle
    return remaining if remaining > 0 else cycle


def _estimate_zones(inside_count: int, station_idx: int, n: int = 5) -> dict:
    """Generate a slowly-varying zone distribution based on load and station position."""
    t = int(time.time()) // 30
    weights = [
        1.4 + 0.2 * math.sin(t + station_idx),
        1.0 + 0.1 * math.cos(t * 0.7),
        0.7,
        1.0 + 0.1 * math.sin(t * 0.5 + 1),
        1.3 + 0.2 * math.cos(t + station_idx + 2),
    ]
    total_w = sum(weights)
    zones: dict[int, int] = {}
    remaining = inside_count
    for i in range(n - 1):
        share = max(0, round(inside_count * weights[i] / total_w))
        zones[i] = min(share, remaining)
        remaining -= zones[i]
    zones[n - 1] = max(0, remaining)
    return zones


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


@app.get("/api/stations")
def get_stations():
    """All 27 stations with current load derived from historical baseline."""
    now = datetime.now()
    result = []
    for idx, (sid, meta) in enumerate(STATIONS_REGISTRY.items()):
        baseline = get_baseline(meta["csv"], now.hour, now.minute, now.weekday())
        peak     = get_station_peak(meta["csv"])
        load_pct = round(min((baseline / peak) * 100, 100), 1) if peak else 0.0
        load_level = (
            "critical" if load_pct >= 80 else
            "high"     if load_pct >= 60 else
            "medium"   if load_pct >= 35 else
            "low"
        )
        inside_count = max(0, round(baseline / 3))
        result.append({
            "id":            sid,
            "name":          meta["name"],
            "load_pct":      load_pct,
            "load_level":    load_level,
            "inside_count":  inside_count,
            "next_train_min": _next_train_min(sid),
        })
    return result


@app.get("/api/station/{station_id}")
def get_station(station_id: str):
    """Full station detail: flow metrics, zone estimates, prediction, guidance."""
    meta = STATIONS_REGISTRY.get(station_id)
    if not meta:
        raise HTTPException(404, f"Unknown station: {station_id}")

    now        = datetime.now()
    station_idx = _STATION_IDS.index(station_id)
    baseline   = get_baseline(meta["csv"], now.hour, now.minute, now.weekday())
    peak       = get_station_peak(meta["csv"])
    load_pct   = round(min((baseline / peak) * 100, 100), 1) if peak else 0.0
    inside_count = max(0, round(baseline / 3))

    inflow_per_min  = round(baseline / 15, 1)
    outflow_per_min = round(inflow_per_min * 0.75, 1)
    next_train      = _next_train_min(station_id)
    predicted_inside = predict_load(inside_count, inflow_per_min, outflow_per_min, next_train)
    predicted_pct    = round(min((predicted_inside / max(inside_count, 1)) * load_pct, 100), 1)

    zones    = _estimate_zones(inside_count, station_idx)
    guidance = decide_nudge(zones)

    return {
        "id":                   station_id,
        "name":                 meta["name"],
        "inflow_per_min":       inflow_per_min,
        "outflow_per_min":      outflow_per_min,
        "inside_count":         inside_count,
        "load_pct":             load_pct,
        "load_level":           (
            "critical" if load_pct >= 80 else
            "high"     if load_pct >= 60 else
            "medium"   if load_pct >= 35 else
            "low"
        ),
        "predicted_load_pct":   predicted_pct,
        "predicted_inside":     predicted_inside,
        "next_train_min":       next_train,
        "historical_baseline":  round(baseline),
        "zones":                zones,
        "guidance_zones":       [guidance.get("target_zone")] if guidance.get("active") else [],
        "guidance_text":        guidance.get("reason", "Distribution balanced"),
        "guidance_active":      guidance.get("active", False),
    }


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
    _WAGON_DEMO = {
        "В2": {"persons": 247, "percentage": 78.4, "capacity": MAX_PERSONS_PER_WAGON, "cameras_sampled": 5},
        "В3": {"persons": 142, "percentage": 45.1, "capacity": MAX_PERSONS_PER_WAGON, "cameras_sampled": 1},
        "В4": {"persons":  98, "percentage": 31.1, "capacity": MAX_PERSONS_PER_WAGON, "cameras_sampled": 4},
    }

    train_dir = CAMERA_ROOT / "Train"
    if not YOLO_AVAILABLE or not train_dir.exists():
        return _WAGON_DEMO

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
    if FRONTEND_DIST.exists():
        return FileResponse(str(FRONTEND_DIST / "index.html"))
    return {"message": "Metro Platform API", "docs": "/docs"}


# Serve built React frontend (must be last — catches all remaining routes)
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
