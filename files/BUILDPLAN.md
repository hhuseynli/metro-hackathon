# Build Plan — 14 Hours

## Guiding Principles
- Person 4's time is sacred. Never block them.
- Demo must work reliably. Prefer pre-processed data over fragile live inference if needed.
- Freeze codebase at hour 12. Hours 12-14 are dry run + polish only.
- Person 2 starts slides NOW. Not after the prototype is done.

---

## Hour 1-2: Setup & Unblock

### Person 4
- [ ] Install dependencies: `pip install ultralytics opencv-python fastapi uvicorn pandas numpy openpyxl`
- [ ] Test YOLO: `python -c "from ultralytics import YOLO; model = YOLO('yolov8n.pt'); print('ready')"`
- [ ] Load one AVI frame, run inference, confirm persons detected
- [ ] Load weight data, inspect columns and timestamp format
- [ ] Confirm weight timestamps can be matched to camera footage timestamps

### Person 3
- [ ] Load weight data into pandas, clean and standardize timestamps
- [ ] Identify which station's camera footage is most usable (clearest overhead view, longest clip)
- [ ] Find 2-3 behavioral science sources on ambient nudging in public spaces

### Person 1
- [ ] Set up React + Vite project: `npm create vite@latest frontend -- --template react`
- [ ] Install Tailwind CSS
- [ ] Sketch platform zone layout component (static first, data later)

### Person 2
- [ ] Create slide deck structure (8-10 slides)
- [ ] Write problem slide: "Every Baku commuter knows this feeling..."
- [ ] Write data slide placeholder (KEY STAT goes here when ready)

---

## Hour 3-6: Core Build

### Person 4
- [ ] Zone segmentation: divide AVI frame into N zones (hardcode coordinates first)
- [ ] Per-frame zone person count loop
- [ ] Weight-camera correlation script: match timestamps, compute zone→car mapping
- [ ] **DELIVER KEY STAT to Person 2 and Person 3**
- [ ] Nudge decision logic: `if zone_density[i] < threshold: recommend_nudge(zone=i)`
- [ ] FastAPI skeleton: `/api/zones`, `/api/nudge`, `/api/stats`

### Person 1
- [ ] Platform visualization component with N zones
- [ ] Color intensity per zone based on density value (receive mock data first)
- [ ] Nudge indicator component: shows which zone is targeted + nudge type
- [ ] Wire up API polling (fetch /api/zones every 2s)

### Person 3
- [ ] Deliver clean weight data to Person 4 in agreed format
- [ ] Write behavioral science paragraph for Person 2
- [ ] Translate Person 4's zone count output format into what Person 1 needs

### Person 2
- [ ] Fill in KEY STAT slide once received
- [ ] Write innovation slide: behavioral nudging vs. explicit signs
- [ ] Write system diagram slide (use ARCHITECTURE section from CLAUDE.md)

---

## Hour 7-10: Integration & Polish

### Person 4
- [ ] FastAPI fully serving real data from YOLO pipeline
- [ ] Test end-to-end: video → zones → API → confirm numbers look right
- [ ] Optional: MJPEG stream endpoint with zone overlays

### Person 1
- [ ] Full dashboard connected to live FastAPI
- [ ] Historical stats panel showing imbalance data
- [ ] Visual polish: colors, typography, layout
- [ ] Nudge visualization: subtle lighting zone indicator (warm glow effect on target zone)

### Person 3
- [ ] Full integration test: run backend, open frontend, confirm data flows
- [ ] Document any bugs for Person 4 to fix
- [ ] Help Person 2 rehearse narrative

### Person 2
- [ ] Complete all slides
- [ ] Write demo script (what to say at each dashboard screen)
- [ ] First solo rehearsal

---

## Hour 11-12: Dry Run

- [ ] Full team dry run — presentation + live demo
- [ ] Person 3 times the run (target: under 7 minutes)
- [ ] Fix critical bugs only — no new features
- [ ] **FREEZE CODEBASE after hour 12**

---

## Hour 13-14: Final Prep

- [ ] Rest
- [ ] One more rehearsal if needed
- [ ] Confirm laptop, cables, network for demo environment
- [ ] Present confidently

---

## Fallback Plans

### If YOLO pipeline isn't stable by hour 8:
→ Pre-process a 5-minute clip, save zone counts to JSON, serve that statically from FastAPI
→ Frontend doesn't know the difference
→ Demo is still live-looking and fully functional

### If weight-camera correlation is taking too long:
→ Use clean_passenger_data gate counts as proxy for zone density
→ Still produces a valid imbalance stat, just less precise

### If FastAPI-React integration is breaking:
→ Person 1 hardcodes realistic mock data into frontend
→ Person 4 focuses on getting the analysis and stats right for presentation
→ Judges see a working UI + valid data analysis, which is sufficient

### If time runs out completely:
→ Working YOLO demo + strong presentation beats broken full-stack every time
→ Prioritize: stats → YOLO demo → presentation → dashboard
