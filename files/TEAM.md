# Team Roles

## Person 1 — Frontend / UI/UX
**Owns:** React dashboard  
**Deliverables:**
- MetroMap: SVG metro map with 3 lines, 27 clickable stations — **done**
- PlatformDiagram: live 5-zone heatmap — **done**
- WagonOccupancy: per-wagon occupancy bars — **done**
- AnalysisPanel: camera selector, preview frame, ByteTrack IN/OUT UI — **done**
- Station detail view: connect `/api/station/{id}` to a slide-in panel or screen

**Do NOT ask Person 1 to touch Python, YOLO, or data analysis.**

**Data contract — actual API responses:**

```json
// GET /api/stations
[
  {
    "id": "nizami",
    "name": "Nizami",
    "load_pct": 72.0,
    "load_level": "high",
    "inside_count": 312,
    "next_train_min": 3
  }
]

// GET /api/station/{id}
{
  "id": "nizami",
  "name": "Nizami",
  "inflow_per_min": 17.0,
  "outflow_per_min": 12.8,
  "inside_count": 85,
  "load_pct": 72.0,
  "load_level": "high",
  "predicted_load_pct": 78.5,
  "predicted_inside": 104,
  "next_train_min": 3,
  "historical_baseline": 255,
  "zones": { "0": 22, "1": 17, "2": 11, "3": 17, "4": 18 },
  "guidance_zones": [2],
  "guidance_text": "Zone 0 (22p) vs Zone 2 (11p)",
  "guidance_active": true
}

// GET /api/zones  (live platform camera — used by PlatformDiagram)
{
  "zones": { "0": 18, "1": 15, "2": 9, "3": 4, "4": 3 },
  "frame_count": 142,
  "mode": "demo",
  "fps": 2.0
}

// GET /api/nudge
{
  "active": true,
  "target_zone": 3,
  "target_car": 4,
  "overcrowded_zone": 0,
  "overcrowded_car": 1,
  "nudge_type": "lighting+sound",
  "intensity": "subtle",
  "ratio": 6.0,
  "reason": "Zone 0 (18p) vs Zone 3 (4p)",
  "messages": {
    "az": "Arxaya doğru irəliləyin — boş vaqonlar sizi gözləyir",
    "en": "Move toward the rear — less crowded cars ahead",
    "ru": "Пройдите в хвост поезда — там свободнее"
  }
}

// GET /api/stats
{
  "avg_imbalance_pct": 43.2,
  "most_crowded_car_avg": 78.4,
  "least_crowded_car_avg": 31.1,
  "ratio": 2.5,
  "train_visits_analyzed": 284
}

// GET /api/wagon-occupancy
{
  "В2": { "persons": 12, "percentage": 3.8, "capacity": 315, "cameras_sampled": 5 },
  "В3": { "persons": 4,  "percentage": 1.3, "capacity": 315, "cameras_sampled": 1 },
  "В4": { "persons": 18, "percentage": 5.7, "capacity": 315, "cameras_sampled": 6 }
}

// GET /api/cameras
{
  "Escalator": ["28MAY11 ESKALATOR UST-16.04.2026 SAAT 18.00.avi", ...],
  "Platform":  ["28MAY28 2-CI YOL BAS-16.04.2026 SAAT 18.00.avi", ...],
  "Train":     ["В2CAM1-16.04.2026.avi", ...]
}
```

---

## Person 2 — Presentation
**Owns:** Slide deck, narrative, rehearsal  
**Start now — not after the prototype is done.**

**Slide structure:** See PRESENTATION.md  
**Most important task:** Get the KEY STAT from Person 4 by hour 6 and build the data slide around it.

---

## Person 3 — Project Manager / Generalist
**Owns:** Coordination, data cleaning, unblocking  
**Deliverables:**
- Clean and format weight data for Person 4
- Bridge Person 4's output format to Person 1's expected format
- Find 2-3 behavioral science / transport nudging sources for Person 2
- Flag timeline slippage immediately
- Run integration test at hour 10

**If Person 4 is blocked for 30+ minutes → drop everything and help.**

---

## Person 4 — Backend / Data
**Owns:** Everything technical — YOLO, correlation, FastAPI  
**Deliverables:**
- [x] YOLO setup + test inference on AVI footage
- [x] Zone segmentation on platform camera (`zone_detector.py`)
- [x] ByteTrack IN/OUT tracking (`analyze_video.py`)
- [x] Wagon occupancy from train cameras (`/api/wagon-occupancy`)
- [x] Historical baseline + load prediction (`predictor.py`)
- [x] Sliding-window flow engine (`flow_engine.py`)
- [x] All 27 stations endpoint (`/api/stations`, `/api/station/{id}`)
- [x] Nudge engine (`nudge_engine.py`)
- [x] FastAPI with all endpoints
- [ ] Weight-camera correlation → KEY STAT (`correlate.py` — needs actual weight file)

**Person 4's time is the scarcest resource. Protect it.**

---

## Escalation
- Person 4 blocked 30+ min → Person 3 helps immediately
- Frontend-backend integration breaking → Person 3 mediates
- Key stat not ready by hour 6 → Person 3 extracts manually from CSVs
- Anything breaking at hour 11 → fallback plan (see CLAUDE.md)
