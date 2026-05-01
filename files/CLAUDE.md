# Metro Hackathon 2026 — CLAUDE.md
## Challenge 4: Perronda sərnişinlərin bərabər paylanması

> Platform passenger distribution optimization using computer vision, weight sensor data, and subtle environmental nudging (lighting + sound) — without passengers knowing they're being guided.

---

## Project Overview

**Hackathon:** Metro Hackathon 2026, May 1–3, İçərişəhər station, Baku  
**Challenge:** #4 — Equal distribution of passengers on the platform along train cars  
**Team:** 4 people (see TEAM.md)  
**Time remaining:** ~14 hours of development  
**Presentation:** Day 3 final

### Core Insight
Passengers cluster near platform entrances, causing front cars to be 80%+ full while rear cars sit at 35%. We know this from correlated weight sensor data (per-car, per-train-visit) + overhead camera footage. Our system detects this imbalance and subtly adjusts platform lighting and ambient sound to naturally draw passengers toward less crowded zones — without explicit signs or instructions.

### Innovation
- **Not reactive — predictive:** Historical weight + camera data reveals consistent overcrowding patterns by time-of-day and day-of-week
- **Behavioral nudging, not instruction:** Lighting warmth and ambient sound shift subtly; passengers self-distribute without realizing
- **Multi-modal ground truth:** Weight sensors give exact car occupancy; cameras give platform zone occupancy; together they form a closed validation loop

---

## Tech Stack

### Backend (Person 4)
- **Language:** Python 3.10+
- **CV:** YOLOv8 (ultralytics) — person detection on AVI camera footage
- **Data:** pandas, numpy — weight data correlation, zone mapping
- **API:** FastAPI — serve zone density + nudge recommendations to frontend
- **Video:** OpenCV (cv2) — AVI frame processing

### Frontend (Person 1)
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **Visualization:** Platform zone heatmap, nudge status indicators
- **Data:** Polling FastAPI every 2s for live zone density

### Data Files (see DATA.md)
- `total_data_15min.csv` — 15-min passenger bins, 27 stations, Jan 2025–Mar 2026
- `Clean_passenger_data_01012025-31032026.csv` — gate-level daily counts
- `NFC_16_02_2026.csv` / `QR_16_02_2026.csv` / `SC_16_02_2026.csv` — transaction logs Feb 16 2026
- `Passenger_density_16_02_2026.xlsx` — density data
- Weight sensor data — per-car per-train-visit with timestamps (separate folder)
- Camera footage — AVI format, overhead slightly angled, platform coverage

---

## Architecture

```
AVI Camera Feed
      │
      ▼
YOLOv8 Person Detection
      │
      ▼
Zone Segmentation (frame divided into N zones = car positions)
      │
      ▼
Density per Zone (persons/m²)
      │
      ├──────────────────────────────────┐
      ▼                                  ▼
Historical Weight Model            FastAPI Server
(which zones → which cars          /api/zones  → frontend
 historically overcrowded)         /api/nudge  → nudge recommendation
      │
      ▼
Nudge Decision Engine
(which zone needs more passengers)
      │
      ▼
Environmental Output
  - Lighting: warmer/brighter in target zone
  - Sound: subtle ambient shift toward target zone
```

---

## Core Features (MVP — must ship)

### 1. YOLO Zone Detection
- Load AVI footage with OpenCV
- Run YOLOv8n (nano — fastest) on each frame
- Divide frame into 4-6 horizontal zones matching car positions
- Count persons per zone per frame
- Output: `{zone_1: 12, zone_2: 4, zone_3: 7, zone_4: 2}` every ~2s

### 2. Weight-Camera Correlation Model
- Load historical weight data (per car, per train visit, timestamped)
- Load camera zone density at matching timestamps
- Map: zone_X on platform → car_Y on train
- Quantify: average load imbalance (e.g. car 1 = 78%, car 4 = 31%)
- Output: validated zone→car mapping + imbalance statistics

### 3. Nudge Decision Engine
- Input: current zone densities + historical zone→car mapping
- Logic: identify least-crowded car → recommend nudge toward corresponding platform zone
- Output: `{target_zone: 4, nudge_type: "lighting+sound", intensity: "subtle"}`

### 4. FastAPI Endpoints
```
GET /api/zones     → current zone densities
GET /api/nudge     → current nudge recommendation
GET /api/stats     → historical imbalance statistics
GET /api/video     → MJPEG stream with zone overlays (optional)
```

### 5. React Dashboard
- Platform diagram with N zones
- Real-time density heatmap per zone
- Nudge status: which zone is being nudged, type, intensity
- Historical stats panel: "Car 1 is 2.3x more crowded than Car 4 on Monday mornings"
- Behavioral science callout: why nudging works without explicit instruction

---

## Stretch Features (only if time allows)

- Live MJPEG video stream with YOLO bounding boxes + zone overlays
- Time-of-day prediction: "In 15 minutes, zone A will become crowded based on historical patterns"
- Mobile notification mockup (passenger receives "walk to far end" via NFC tap)

---

## Judging Criteria Alignment

| Criterion | Our approach | Target score |
|---|---|---|
| 1. Problem-solution fit | Real Baku Metro data, validated imbalance pattern | 9/10 |
| 2. Innovation | Behavioral nudging (not signs), multi-modal sensing | 9/10 |
| 3. Working prototype | Live YOLO pipeline → FastAPI → React dashboard | 8/10 |
| 4. User value & impact | Every commuter feels this daily, no behavior change required | 9/10 |
| 5. Presentation | Person 2 owns this, narrative built around the key stat | 9/10 |

---

## Key Stat to Derive (Person 4 + Person 3 priority)
> "Across X train visits at [station], passengers clustering in platform zones A-B results in cars 1-2 averaging Y% capacity while cars 4-5 average Z% — a W% imbalance. Our nudge system targets this gap."

This single validated number is the foundation of the entire presentation.

---

## Commands

```bash
# Setup
pip install ultralytics opencv-python fastapi uvicorn pandas numpy openpyxl

# Run backend
uvicorn main:app --reload --port 8000

# Run frontend
cd frontend && npm install && npm run dev

# Test YOLO on single frame
python scripts/test_yolo.py --video path/to/platform.avi

# Run correlation analysis
python scripts/correlate_weight_camera.py
```

---

## Definition of Done
- [ ] YOLO detects persons in AVI footage and outputs zone counts
- [ ] Weight-camera correlation produces validated zone→car mapping
- [ ] FastAPI serves zone density and nudge recommendation
- [ ] React dashboard shows live platform zones + nudge status
- [ ] Key imbalance stat derived and validated
- [ ] Presentation narrative built around the stat
- [ ] Full dry run completed before presentation
