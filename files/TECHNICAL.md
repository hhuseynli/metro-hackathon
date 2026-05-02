# Technical Implementation

## Actual file layout

```
backend/
  main.py                     ← FastAPI server, all endpoints
  requirements.txt
  key_stat.json               ← imbalance metrics (overrides hardcoded defaults)
  preview.sh                  ← bash helper for local preview/analysis runs
  outputs/                    ← generated MP4s and JPEGs
  scripts/
    yolo_utils.py             ← shared constants (CONF, IOU, IMGSZ) + blur_faces()
    zone_detector.py          ← YOLO zone counts from a frame or video
    nudge_engine.py           ← decide_nudge(): which zone to guide passengers to
    flow_engine.py            ← FlowEngine sliding-window inflow/outflow tracker
    predictor.py              ← historical baseline + load prediction
    analyze_video.py          ← ByteTrack IN/OUT counter, writes annotated MP4
    preview_detection.py      ← single-frame YOLO detection, saves annotated JPEG
    correlate.py              ← derives key stat from weight sensor data

frontend/src/
  App.jsx                     ← tab nav (Xəritə/Platform/Statistika/Analiz), 100dvh layout
  components/
    MetroMap.jsx              ← SVG metro map; fullscreen prop fills viewport, card mode for embed
    PlatformDiagram.jsx       ← live 5-zone heatmap (polls /api/zones)
    WagonOccupancy.jsx        ← wagon occupancy bars (calls /api/wagon-occupancy)
    AnalysisPanel.jsx         ← camera explorer + preview + ByteTrack UI
    StationDetail.jsx         ← slide-up overlay; zone bars, load %, prediction, guidance
    StatusBar.jsx             ← compact dot variant for header; full bar for tab content
    NudgePanel.jsx            ← nudge engine output (dark card)
    StatsPanel.jsx            ← historical imbalance key stat (dark card)
  hooks/
    useMetroData.js           ← polls /api/zones, /api/nudge, /api/stats; exports useStation(id)
    useAnalysis.js            ← useCameras(), useAnalysis() for AnalysisPanel
```

---

## 1. Shared YOLO constants — `scripts/yolo_utils.py`

```python
import cv2
import numpy as np

CONF = 0.10   # low threshold — catches people in background
IOU  = 0.7
IMGSZ = 1280  # large input — better for wide platform shots
HEAD_FRACTION = 0.28

def blur_faces(frame, boxes):
    out = frame.copy()
    for box in boxes:
        x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
        head_h = int((y2 - y1) * HEAD_FRACTION)
        fy1, fy2 = max(0, y1), min(frame.shape[0], y1 + head_h)
        fx1, fx2 = max(0, x1), min(frame.shape[1], x2)
        if fy2 > fy1 and fx2 > fx1:
            out[fy1:fy2, fx1:fx2] = cv2.GaussianBlur(out[fy1:fy2, fx1:fx2], (51, 51), 20)
    return out
```

---

## 2. YOLO Zone Detection — `scripts/zone_detector.py`

Divides a frame horizontally into N zones and counts detected persons per zone.
Model is lazy-loaded once and reused.

```python
from scripts.yolo_utils import CONF, IOU, IMGSZ

def get_zone_counts(frame, n_zones=5, model=None) -> dict[int, int]:
    """Returns {zone_index: person_count} for each horizontal zone."""
    ...

def process_video(video_path: str, sample_every_n_frames: int = 30) -> list:
    """Sample every N frames → list of {timestamp_sec, zones}. Saves to zone_counts.json."""
    ...
```

Run standalone to pre-compute zone JSON for `ZONE_JSON` precomputed mode:
```bash
python3 scripts/zone_detector.py data/Camera/Platform/somefile.avi
# → zone_counts.json
```

---

## 3. Nudge Engine — `scripts/nudge_engine.py`

Replaces the earlier `guidance.py` concept. Returns a richer nudge dict including
multilingual messages and intensity level.

```python
def decide_nudge(zone_counts: dict, threshold_ratio: float = 1.5) -> dict:
    # Returns:
    # { active, target_zone, target_car, overcrowded_zone, overcrowded_car,
    #   nudge_type, intensity, ratio, reason, messages: {az, en, ru} }
```

---

## 4. Flow Engine — `scripts/flow_engine.py`

Sliding-window inflow/outflow tracker. Feed it entry/exit events from camera counts
or transaction CSV; get rates and a running inside count.

```python
from scripts.flow_engine import FlowEngine, seed_from_transactions

engine = FlowEngine(window_seconds=60)
engine.record_inflow(3)          # 3 people entered
engine.record_outflow(1)         # 1 person left
metrics = engine.get_metrics()
# → {"inflow_per_min": 3.0, "outflow_per_min": 1.0, "inside_count": 2}

# Seed from NFC/QR/SC CSV:
seed_from_transactions(engine, "data/Data/NFC 16.02.2026.csv", "Nizami")
```

---

## 5. Predictor — `scripts/predictor.py`

Loads `total_data_15min.csv` once (lazy, cached) and provides:
- Historical baseline for any station/time-of-week
- Station's all-time peak count
- Linear load prediction at next train arrival

```python
from scripts.predictor import get_baseline, get_station_peak, predict_load

baseline = get_baseline("Nizami", hour=8, minute=30, dayofweek=0)   # Monday 08:30
peak     = get_station_peak("Nizami")
load_pct = (baseline / peak) * 100

predicted_inside = predict_load(
    current_inside=120,
    inflow_per_min=8.5,
    outflow_per_min=3.2,
    minutes_until_train=4,
)
```

**Station names** must match the CSV exactly (see `STATIONS_REGISTRY` in main.py for the
full id → csv_name mapping).

---

## 6. ByteTrack IN/OUT — `scripts/analyze_video.py`

Runs YOLOv8s + ByteTrack on a video, counts persons crossing a horizontal midline,
outputs an annotated H.264 MP4.

```bash
python3 scripts/analyze_video.py <video_path> [--seconds 30] [--outdir outputs/]
```

Key design:
- `deque(maxlen=15)` centroid history per track ID
- Direction: `dy > 15` → OUT, `dy < -15` → IN
- Counted IDs removed from dict to prevent double-counting
- `avc1` (H.264) codec — required for QuickTime-compatible output on macOS

---

## 7. FastAPI Server — `backend/main.py`

### Startup modes (env vars)

| Variable | Effect |
|---|---|
| `VIDEO_PATH=<path>` | Live YOLO loop on that AVI |
| `ZONE_JSON=<path>` | Precomputed loop replaying saved zone samples |
| _(neither)_ | Demo loop — synthetic drifting counts |
| `CAMERA_ROOT=<path>` | Root folder for camera AVI files |
| `OUTPUTS_DIR=<path>` | Where tracked MP4s are written |

### All endpoints

```
GET  /api/zones              → {zones: {0..4: count}, frame_count, mode, fps}
GET  /api/nudge              → nudge object from decide_nudge()
GET  /api/stats              → key_stat.json contents
GET  /api/status             → {mode, yolo_available, frame_count, fps}

GET  /api/stations           → [{id, name, load_pct, load_level, inside_count, next_train_min}]
GET  /api/station/{id}       → full detail — see data contract in TEAM.md

GET  /api/cameras            → {folder_name: [filename, ...]}
POST /api/preview            → body: {folder, filename, frame_pct: 0.0–1.0}
                               → JPEG with X-Person-Count header
POST /api/track              → body: {folder, filename, seconds?: float}
                               → {job_id}
GET  /api/track/{job_id}     → {status, total_in, total_out, video_url?}
GET  /api/outputs/{filename} → serves MP4 or JPEG from OUTPUTS_DIR

GET  /api/wagon-occupancy    → {wagon: {persons, percentage, capacity, cameras_sampled}}
```

### Station registry

`STATIONS_REGISTRY` in main.py maps 27 URL-safe IDs to display names and CSV names:
```python
"nariman-narimanov": {"name": "Nəriman Nərimanov", "csv": "Nariman Narimanov"},
"nizami":            {"name": "Nizami",             "csv": "Nizami"},
# ... 25 more
```

### Station load calculation

`/api/stations` and `/api/station/{id}` use historical data, not live cameras:
```
baseline   = get_baseline(csv_name, now.hour, now.minute, now.weekday())
peak       = get_station_peak(csv_name)
load_pct   = (baseline / peak) * 100
inside_count = round(baseline / 3)          # rough 45-min dwell estimate
inflow_rate  = baseline / 15               # entries per minute
```

---

## 8. Frontend Hooks

### `useMetroData.js` — live zone/nudge/stats polling
```javascript
const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function useMetroData(intervalMs = 2000) {
  // polls /api/zones, /api/nudge, /api/stats every intervalMs
  // returns { zones, nudge, stats, error }
}
```

### `useAnalysis.js` — camera explorer + ByteTrack UI
```javascript
export function useCameras() { /* GET /api/cameras */ }

export function useAnalysis() {
  // preview()       → POST /api/preview → blob URL + X-Person-Count
  // startTracking() → POST /api/track → poll GET /api/track/{job_id}
}
```

### `WagonOccupancy.jsx` — direct fetch
```javascript
fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/wagon-occupancy`)
```

---

## Run Order

```bash
# 1. Install Python deps
cd backend && pip install -r requirements.txt

# 2. Verify YOLO (downloads yolov8s.pt on first run)
cd backend && python3 -c "from ultralytics import YOLO; YOLO('yolov8s.pt'); print('ready')"

# 3. (Optional) Pre-compute zone JSON for demo mode
cd backend && python3 scripts/zone_detector.py ../data/Camera/Platform/<file>.avi
# start server with: ZONE_JSON=zone_counts.json uvicorn main:app --reload --port 8000

# 4. Start backend (demo mode — no video needed)
cd backend && uvicorn main:app --reload --port 8000

# 5. Start frontend
cd frontend && npm install && npm run dev

# 6. Key stat from weight data
cd backend && python3 scripts/correlate.py
```

---

## Deployment

### Backend — Render
Configured in `render.yaml` at repo root. Build: `cd backend && pip install -r requirements.txt`. Start: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`. No env vars needed for demo mode; set `CAMERA_ROOT` and `OUTPUTS_DIR` if using live video.

### Frontend — Vercel
Root directory: `frontend`. Framework preset: Vite. Set one env var: `VITE_API_URL=https://<your-render-app>.onrender.com`. No build command override needed (`npm run build` is auto-detected).

### Mobile
The frontend is fully responsive and mobile-ready:
- Layout uses `h-[100dvh]` to handle iOS Safari's dynamic viewport (avoids content hiding behind the address bar)
- Tab nav fits on any screen width; tabs scroll horizontally if needed
- Map tab: SVG fills full height on desktop; horizontally scrollable with `minWidth: 560px` on mobile (labels remain readable)
- Station detail: slide-up overlay capped at 65vh so the map stays visible behind it
- `active:` touch states on all interactive elements
- `pb-safe` class on scrollable tab content reserves space for iOS home indicator

---

## Troubleshooting

| Problem | Fix |
|---|---|
| YOLO not finding people | Already using `yolov8s.pt` + conf=0.10 — check lighting/angle |
| AVI won't open | `pip install opencv-python-headless` |
| CORS errors | Verify `CORSMiddleware` in main.py (`allow_origins=["*"]`) |
| Video too slow | Already resized to 640×480 in live loop |
| MP4 corrupted in QuickTime | Must use `avc1` codec — `mp4v` breaks QuickTime on macOS |
| `No module named 'scripts'` | Run from `backend/` directory, not `backend/scripts/` |
| Vite proxy not working | Only applies in dev — check `vite.config.js` proxy block |
| Map cut off on iOS Safari | Layout uses `100dvh` — if still clipping check for missing `viewport` meta in index.html |
