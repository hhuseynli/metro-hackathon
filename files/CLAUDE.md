# Metro Hackathon 2026 — CLAUDE.md
## Challenge 4: Perronda sərnişinlərin bərabər paylanması

> A station-level passenger flow dashboard that synthesizes camera (CV), schedule, and weight sensor data to track inflow/outflow, predict station load, and guide passengers to correct platform zones **before the train arrives** — shown on existing metro directional displays.

---

## Project Overview

**Hackathon:** Metro Hackathon 2026, May 1–3, İçərişəhər station, Baku  
**Challenge:** #4 — Equal distribution of passengers on the platform along train cars  
**Team:** 4 people (see TEAM.md)  
**Presentation:** Day 3 final

### Core Concept
The system watches every zone of a metro station — entrance, escalators, platform, trains — using overhead cameras + weight sensors + schedule data. It tracks inflow, outflow, and current people inside. Using the train schedule it predicts the load at the moment of train arrival. Before the train arrives, it directs incoming passengers to specific platform zones — so cars load evenly without passengers needing to think about it.

### Innovation
- Guidance happens **before** the train arrives — passengers position themselves, not scramble at doors
- Uses **existing display infrastructure** at platform entrances — no new hardware required
- **Multi-modal sensing** — camera CV counts + weight ground truth + schedule sync = high confidence prediction
- **Full station visibility** — not just platform, but entrance → escalator → platform → train as one connected flow

---

## Tech Stack

### Backend
- **Language:** Python 3.10+
- **CV:** YOLOv8s (ultralytics) — `yolov8s.pt`, conf=0.10, iou=0.7, imgsz=1280
- **Tracking:** ByteTrack (via ultralytics) for in/out counting
- **Data:** pandas, numpy, openpyxl
- **API:** FastAPI + uvicorn
- **Video:** OpenCV (cv2), avc1/H.264 codec for output

### Frontend
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **Polling:** fetch every 2s for live zone data
- **Deployment:** Vercel (frontend) + Render (backend)
- **Mobile:** responsive, `100dvh` full-screen layout, tab nav works on touch

---

## Data Sources

| Source | What it provides |
|---|---|
| Camera — Entrance (AVI) | Inflow count: people entering station |
| Camera — Escalator (AVI) | Flow rate up/down toward platform |
| Camera — Platform (AVI) | Zone density: where people stand |
| Camera — Train (AVI) | Car occupancy estimate |
| Weight sensor data | Ground truth car occupancy per train visit (timestamped) |
| Schedule data | Train arrival times per station |
| total_data_15min.csv | 15-min passenger bins, 27 stations, 15 months |
| Clean_passenger_data | Gate-level daily counts |
| NFC/QR/SC transactions | Individual entry events with timestamps |

---

## Architecture

```
CAMERA FEEDS (AVI)  ←  data/Camera/{Platform,Train,Escalator,Entrance}/
  Platform   → YOLO zone_detector.py → density per zone (zones 0–4)
  Train      → YOLO wagon-occupancy  → car occupancy % (В2, В3, В4)
  Any feed   → analyze_video.py      → ByteTrack IN/OUT count + MP4
        │
        ▼
  SYNTHESIS ENGINE
  zone_detector  → zone_counts → nudge_engine → guidance nudge
  predictor.py   → historical baseline (total_data_15min.csv)
                 → predict_load(inside, inflow_rate, outflow_rate, minutes)
  flow_engine.py → sliding-window inflow/outflow rates from live events
        │
        ▼
  FASTAPI SERVER  (backend/main.py)
  GET  /api/zones              → live zone counts + nudge state (platform cam)
  GET  /api/nudge              → current guidance nudge
  GET  /api/stats              → key stat JSON (imbalance metrics)
  GET  /api/status             → mode (live/precomputed/demo), YOLO available
  GET  /api/stations           → all 27 stations, load_pct from historical baseline
  GET  /api/station/{id}       → full station: flow, zones, prediction, guidance
  GET  /api/cameras            → list camera folders + AVI filenames
  POST /api/preview            → single-frame YOLO detection → annotated JPEG
  POST /api/track              → start async ByteTrack job → job_id
  GET  /api/track/{job_id}     → poll job: status, total_in, total_out, video_url
  GET  /api/outputs/{filename} → serve generated MP4 / JPEG
  GET  /api/wagon-occupancy    → per-wagon occupancy % (В2/В3/В4 train cameras)
        │
        ▼
  REACT DASHBOARD  (frontend/src/)
  Tab: Xəritə    → MetroMap full-screen (fullscreen prop), station detail slide-up overlay
  Tab: Platform  → PlatformDiagram (live zone heatmap) + NudgePanel side-by-side
  Tab: Statistika → StatsPanel (historical imbalance) + WagonOccupancy
  Tab: Analiz    → AnalysisPanel (camera explorer + ByteTrack)
  StatusBar      → compact dot in header on all tabs, full bar in non-map tabs
```

---

## Backend Startup Modes

Set environment variables to control which data source the zone loop uses:

| Env var | Value | Mode |
|---|---|---|
| `VIDEO_PATH` | path to AVI | Live YOLO on platform camera |
| `ZONE_JSON` | path to JSON | Precomputed zone samples (from `zone_detector.py`) |
| _(neither)_ | — | Demo mode — synthetic drifting counts |

Other env vars:
- `CAMERA_ROOT` — path to `data/Camera/` (default: `../../data/Camera` relative to main.py)
- `OUTPUTS_DIR` — where tracked MP4s are written (default: `backend/outputs/`)

---

## Core Features — Status

- [x] YOLO on platform AVI → zone person counts (`zone_detector.py`)
- [x] ByteTrack IN/OUT counting with direction detection (`analyze_video.py`)
- [x] Single-frame preview with person count (`preview_detection.py`)
- [x] Wagon occupancy from train cameras (`/api/wagon-occupancy`)
- [x] Historical baseline from `total_data_15min.csv` (`predictor.py`)
- [x] Sliding-window flow engine (`flow_engine.py`)
- [x] All 27 stations with load estimates (`/api/stations`, `/api/station/{id}`)
- [x] Guidance nudge engine (`nudge_engine.py`)
- [x] Key stat JSON (`key_stat.json` / `/api/stats`)
- [x] Metro map SVG (3 lines, clickable stations, passenger stats)
- [x] Live platform zone heatmap (PlatformDiagram)
- [x] Camera analysis panel (AnalysisPanel)
- [x] Wagon occupancy panel (WagonOccupancy)
- [x] Station detail view (StationDetail — zone bars, load %, prediction, guidance, slide-up overlay)
- [x] Tab navigation (Xəritə / Platform / Statistika / Analiz)
- [x] Full-screen map tab with slide-up station detail overlay
- [x] NudgePanel and StatsPanel wired into app
- [x] Mobile-responsive layout (`100dvh`, touch-friendly tabs, scrollable content)

---

## Fallback Data Strategy
If live YOLO pipeline is unstable during demo:
- Pre-process one AVI clip with `zone_detector.py` → save as `zone_counts.json`
- Start server with `ZONE_JSON=zone_counts.json` — serves in loop
- Transaction data (NFC/QR/SC) used as inflow proxy if entrance cam fails
- `total_data_15min.csv` drives all 27-station load estimates at any time

---

## Key Stat
Stored in `backend/key_stat.json`. Default fallback values are hardcoded in `main.py`.
```json
{
  "avg_imbalance_pct": 43.2,
  "most_crowded_car_avg": 78.4,
  "least_crowded_car_avg": 31.1,
  "ratio": 2.5,
  "train_visits_analyzed": 284
}
```

---

## Commands

```bash
# Setup (inside backend/)
pip install -r requirements.txt

# Backend (dev)
cd backend && uvicorn main:app --reload --port 8000

# Frontend (dev)
cd frontend && npm install && npm run dev

# Single-frame detection preview
cd backend && bash preview.sh data/Camera/Platform/somefile.avi

# Full video IN/OUT tracking (first 30 seconds)
cd backend && python3 scripts/analyze_video.py data/Camera/Platform/somefile.avi --seconds 30

# Zone samples from a video → JSON (for precomputed mode)
cd backend && python3 scripts/zone_detector.py data/Camera/Platform/somefile.avi
# → outputs zone_counts.json

# Key stat from weight data
cd backend && python3 scripts/correlate.py

# Production build
cd frontend && npm run build
cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## Deployment

- **Backend:** Render web service — see `render.yaml` at repo root
- **Frontend:** Vercel — root directory `frontend`, env var `VITE_API_URL=<render-url>`
- Both services use the same GitHub repo
