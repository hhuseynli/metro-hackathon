# Technical Implementation Guide

## For Person 4 — Backend / Data

---

## 1. YOLO Zone Detection Pipeline

```python
# scripts/zone_detector.py
import cv2
from ultralytics import YOLO
import numpy as np
import json

model = YOLO('yolov8n.pt')  # nano = fastest

def get_zone_counts(frame, n_zones=5):
    """
    Divide frame into n_zones horizontal zones (left to right = car 1 to car N)
    Return person count per zone.
    """
    h, w = frame.shape[:2]
    zone_width = w // n_zones
    
    results = model(frame, classes=[0], verbose=False)  # class 0 = person
    
    zone_counts = {i: 0 for i in range(n_zones)}
    
    for box in results[0].boxes:
        x_center = float((box.xyxy[0][0] + box.xyxy[0][2]) / 2)
        zone = min(int(x_center // zone_width), n_zones - 1)
        zone_counts[zone] += 1
    
    return zone_counts

def process_video(video_path, sample_every_n_frames=30):
    """Process AVI, sample every N frames, return zone counts over time."""
    cap = cv2.VideoCapture(video_path)
    results = []
    frame_idx = 0
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % sample_every_n_frames == 0:
            timestamp_sec = frame_idx / fps
            counts = get_zone_counts(frame)
            results.append({'timestamp_sec': timestamp_sec, 'zones': counts})
        frame_idx += 1
    
    cap.release()
    return results

if __name__ == '__main__':
    import sys
    video_path = sys.argv[1]
    results = process_video(video_path)
    with open('zone_counts.json', 'w') as f:
        json.dump(results, f)
    print(f"Processed {len(results)} samples")
    print("Sample:", results[0] if results else "empty")
```

---

## 2. Weight-Camera Correlation

```python
# scripts/correlate.py
import pandas as pd
import numpy as np

def load_weight_data(path):
    """
    Expected columns: train_visit_id, timestamp, car_number, occupancy_pct (or passenger_count)
    Adjust based on actual weight data format.
    """
    df = pd.read_csv(path)  # or read_excel
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    return df

def correlate_zones_to_cars(zone_counts_json, weight_df, tolerance_seconds=60):
    """
    For each train visit in weight_df:
    1. Find camera zone counts at matching timestamp
    2. Record: which zones were dense + which cars were heavy
    3. Build zone→car correlation matrix
    """
    import json
    with open(zone_counts_json) as f:
        zone_data = json.load(f)
    
    # This is the core analysis — adjust column names to match actual weight data
    correlations = []
    
    for visit_id, group in weight_df.groupby('train_visit_id'):
        visit_time = group['timestamp'].iloc[0]
        
        # Find closest camera sample
        # (requires camera footage to have real timestamps, not just frame offsets)
        # If camera footage is from a specific date, offset accordingly
        
        car_loads = group.set_index('car_number')['occupancy_pct'].to_dict()
        correlations.append({
            'visit_id': visit_id,
            'timestamp': visit_time,
            'car_loads': car_loads
        })
    
    return correlations

def compute_key_stat(weight_df):
    """
    Compute the headline imbalance statistic.
    Returns: average max-min spread across all train visits.
    """
    stats = weight_df.groupby('train_visit_id').agg(
        max_load=('occupancy_pct', 'max'),
        min_load=('occupancy_pct', 'min'),
        mean_load=('occupancy_pct', 'mean')
    )
    stats['imbalance'] = stats['max_load'] - stats['min_load']
    
    print(f"=== KEY STAT ===")
    print(f"Average car load imbalance per train: {stats['imbalance'].mean():.1f}%")
    print(f"Most crowded car avg: {stats['max_load'].mean():.1f}%")
    print(f"Least crowded car avg: {stats['min_load'].mean():.1f}%")
    print(f"Ratio: {stats['max_load'].mean() / stats['min_load'].mean():.1f}x")
    print(f"Based on {len(stats)} train visits")
    
    return stats

if __name__ == '__main__':
    # Adjust path to actual weight data file
    weight_df = load_weight_data('data/weight_data.csv')
    stats = compute_key_stat(weight_df)
```

---

## 3. Nudge Decision Engine

```python
# scripts/nudge_engine.py

ZONE_TO_CAR = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5}  # update after correlation

def decide_nudge(zone_counts: dict, threshold_ratio: float = 1.5):
    """
    If any zone is threshold_ratio times denser than another,
    recommend nudging passengers toward the least dense zone.
    """
    if not zone_counts:
        return None
    
    total = sum(zone_counts.values())
    if total == 0:
        return None
    
    max_zone = max(zone_counts, key=zone_counts.get)
    min_zone = min(zone_counts, key=zone_counts.get)
    
    max_count = zone_counts[max_zone]
    min_count = zone_counts[min_zone]
    
    if min_count == 0 or (max_count / max(min_count, 1)) >= threshold_ratio:
        return {
            'active': True,
            'target_zone': min_zone,
            'target_car': ZONE_TO_CAR.get(min_zone, min_zone + 1),
            'nudge_type': 'lighting+sound',
            'intensity': 'subtle',
            'reason': f'Zone {max_zone} is {max_count} vs zone {min_zone} at {min_count}'
        }
    
    return {'active': False, 'reason': 'Distribution is balanced'}
```

---

## 4. FastAPI Server

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import cv2
import threading
import time
from ultralytics import YOLO
from scripts.zone_detector import get_zone_counts
from scripts.nudge_engine import decide_nudge

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared state
state = {
    'zone_counts': {0: 0, 1: 0, 2: 0, 3: 0, 4: 0},
    'nudge': {'active': False},
    'frame_count': 0
}

model = YOLO('yolov8n.pt')

def video_loop(video_path: str):
    cap = cv2.VideoCapture(video_path)
    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # loop video
            continue
        counts = get_zone_counts(frame, model=model)
        state['zone_counts'] = counts
        state['nudge'] = decide_nudge(counts)
        state['frame_count'] += 1
        time.sleep(0.5)  # process 2 frames/sec

@app.on_event("startup")
async def startup():
    VIDEO_PATH = "data/platform.avi"  # update to actual path
    t = threading.Thread(target=video_loop, args=(VIDEO_PATH,), daemon=True)
    t.start()

@app.get("/api/zones")
def get_zones():
    return state['zone_counts']

@app.get("/api/nudge")
def get_nudge():
    return state['nudge']

@app.get("/api/stats")
def get_stats():
    # Return pre-computed historical stats
    return {
        "avg_imbalance_pct": 43.2,  # fill from correlation script output
        "most_crowded_car_avg": 78.4,
        "least_crowded_car_avg": 31.1,
        "ratio": 2.5,
        "train_visits_analyzed": 284
    }
```

---

## 5. Frontend API Integration (for Person 1)

```javascript
// src/hooks/useMetroData.js
import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:8000'

export function useMetroData() {
  const [zones, setZones] = useState({})
  const [nudge, setNudge] = useState({})
  const [stats, setStats] = useState({})

  useEffect(() => {
    const fetchData = async () => {
      const [z, n, s] = await Promise.all([
        fetch(`${API_BASE}/api/zones`).then(r => r.json()),
        fetch(`${API_BASE}/api/nudge`).then(r => r.json()),
        fetch(`${API_BASE}/api/stats`).then(r => r.json()),
      ])
      setZones(z)
      setNudge(n)
      setStats(s)
    }

    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

  return { zones, nudge, stats }
}
```

---

## Run Order

```bash
# Terminal 1 — Backend
pip install ultralytics opencv-python fastapi uvicorn pandas numpy openpyxl
uvicorn main:app --reload --port 8000

# Terminal 2 — Correlation analysis (run once)
python scripts/correlate.py

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev
```

---

## Troubleshooting

**YOLO not detecting persons:** Try `yolov8s.pt` (small) instead of nano — slightly slower but more accurate  
**AVI won't open:** `pip install opencv-python-headless` as alternative  
**CORS errors from frontend:** Check CORSMiddleware is in main.py  
**Video too slow to process:** Increase `sample_every_n_frames` or reduce resolution: `frame = cv2.resize(frame, (640, 480))`
