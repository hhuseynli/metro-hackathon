# Team Roles

## Person 1 — Frontend / UI/UX
**Owns:** React dashboard, platform visualization, nudge UI  
**Deliverables:**
- Platform zone heatmap component
- Real-time density display (polling /api/zones every 2s)
- Nudge status indicator (which zone, what type)
- Historical stats panel
- Overall visual polish for demo

**Do NOT ask Person 1 to:**
- Touch Python or YOLO
- Do data analysis

---

## Person 2 — Presentation
**Owns:** Entire presentation narrative, slides, rehearsal  
**Deliverables:**
- Slide deck (problem → data → system → demo → impact)
- The key imbalance stat slide (get number from Person 4)
- Behavioral science slide (why nudging works — cite 1-2 papers)
- Demo script (what to say while showing the dashboard)
- Rehearsal facilitation (run dry run at hour 11)

**Start now — not day 3.**

**Key narrative arc:**
1. Every Baku commuter knows this problem (relatable hook)
2. We measured it: [KEY STAT] (credibility)
3. Signs don't work — people don't follow them (insight)
4. Light and sound do — here's the science (innovation)
5. Here's our system detecting and nudging in real time (demo)
6. Result: X% more even distribution (impact)

---

## Person 3 — Project Manager / Generalist
**Owns:** Coordination, unblocking, data cleaning, behavioral science research  
**Deliverables:**
- Clean weight data formatted for Person 4's correlation script
- Behavioral science literature summary for Person 2 (2-3 sources)
- Timeline tracking — flag if any task is falling behind
- Bridge between Person 4's output and Person 1's input (data format translation)

**Behavioral science sources to find:**
- Crowd flow and ambient lighting studies (retail/transit)
- Soundscape effect on pedestrian movement
- Nudge theory in public transport (Thaler & Sunstein is the foundation)

---

## Person 4 — Backend / Data
**Owns:** Entire technical core — YOLO pipeline, correlation analysis, FastAPI  
**Deliverables:**
- YOLO setup and test inference on AVI footage
- Zone segmentation logic (divide frame into car-position zones)
- Weight-camera timestamp correlation → zone→car mapping
- KEY STAT: imbalance numbers across N train visits
- Nudge decision engine
- FastAPI with /api/zones, /api/nudge, /api/stats endpoints

**Person 4's time is the most critical resource. Do not interrupt with non-blocking tasks.**

---

## Escalation Protocol
If Person 4 is blocked for more than 30 minutes on anything → Person 3 drops everything to help.  
If frontend and backend integration is breaking → Person 3 mediates.  
If presentation is missing key stats by hour 8 → Person 3 extracts them manually from CSV files.
