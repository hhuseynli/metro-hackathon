# Build Plan — 14 Hours

## Principles
- Person 4's time is sacred
- Demo must work reliably — fallback plans exist, use them without shame
- Freeze codebase at hour 12
- Person 2 starts slides NOW

---

## Hour 1-2: Setup & Foundation

### Person 4
- [ ] `pip install ultralytics opencv-python fastapi uvicorn pandas numpy openpyxl`
- [ ] `python -c "from ultralytics import YOLO; model = YOLO('yolov8n.pt'); print('ready')"`
- [ ] Test on one AVI frame — confirm persons detected
- [ ] Inspect weight data: columns, timestamp format, per-car structure
- [ ] Inspect schedule data: format, arrival times per station

### Person 3
- [ ] Load weight data into pandas, standardize timestamps
- [ ] Identify which station AVI footage is clearest for platform cam
- [ ] Set up agreed data format contract with Person 1 (see TEAM.md)

### Person 1
- [ ] `npm create vite@latest frontend -- --template react`
- [ ] Install Tailwind + Recharts
- [ ] Build Screen 1 skeleton with mock station data (27 stations hardcoded)
- [ ] Build Screen 2 skeleton with mock zone data

### Person 2
- [ ] Open PRESENTATION.md
- [ ] Write slide 1 (hook) and slide 3 (why existing solutions fail)
- [ ] Prepare KEY STAT slide placeholder

---

## Hour 3-6: Core Build

### Person 4
- [ ] Zone segmentation: divide platform AVI frame into 5 zones
- [ ] Per-frame zone person count loop (sample every 30 frames)
- [ ] Weight correlation script → **DELIVER KEY STAT to Person 2 by end of hour 6**
- [ ] Inflow/outflow synthesis logic
- [ ] Schedule integration: parse arrival times → minutes until next train
- [ ] FastAPI skeleton: all endpoints returning mock data first, real data second

### Person 1
- [ ] Screen 1: real color logic based on load_pct thresholds
- [ ] Screen 2: zone heatmap component (5 zones, color by density)
- [ ] Screen 2: flow metrics panel (inflow, outflow, inside count)
- [ ] Screen 2: guidance text component
- [ ] Wire up API polling hook

### Person 3
- [ ] Deliver clean weight data to Person 4
- [ ] Validate data contract between Person 4 output and Person 1 expected format
- [ ] Find behavioral science sources for Person 2

### Person 2
- [ ] Fill KEY STAT slide once received
- [ ] Write system explanation slide (use architecture from CLAUDE.md)
- [ ] Write innovation slide: pre-arrival guidance + existing display infrastructure

---

## Hour 7-10: Integration

### Person 4
- [ ] FastAPI serving real YOLO zone data
- [ ] Real inflow/outflow numbers flowing through
- [ ] Load prediction working (current + predicted at next train)
- [ ] All endpoints tested end-to-end

### Person 1
- [ ] Full dashboard connected to live FastAPI
- [ ] Screen 2: load prediction panel
- [ ] Screen 2: time until next train (countdown)
- [ ] Screen 2: historical baseline comparison
- [ ] Visual polish — colors, spacing, typography

### Person 3
- [ ] Full integration test: run backend → open frontend → verify all data flows
- [ ] Document any broken endpoints for Person 4
- [ ] Help Person 2 rehearse narrative

### Person 2
- [ ] Complete all slides
- [ ] Write demo script (what to say at each screen)
- [ ] First solo rehearsal

---

## Hour 11-12: Dry Run

- [ ] Full team run — presentation + live demo
- [ ] Person 3 times it (target: under 7 minutes)
- [ ] Fix critical bugs only — no new features
- [ ] **FREEZE CODEBASE**

---

## Hour 13-14: Final

- [ ] Rest
- [ ] One rehearsal if needed
- [ ] Confirm display setup, cables, network
- [ ] Present

---

## Fallback Plans

| Problem | Solution |
|---|---|
| YOLO unstable during demo | Pre-process clip → save zone JSON → FastAPI serves in loop |
| Entrance cam unusable | Use NFC/QR/SC transaction timestamps as inflow proxy |
| Weight correlation taking too long | Use gate counts from Clean_passenger_data as proxy |
| FastAPI-React integration breaking | Person 1 hardcodes realistic data; Person 4 focuses on stats for presentation |
| Everything breaking | Working YOLO demo + strong presentation > broken full-stack. Prioritize: key stat → YOLO demo → presentation → dashboard |
