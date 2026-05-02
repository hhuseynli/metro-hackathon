"""
Entrance-specific in/out tracker.

Key difference from the escalator tracker: stationary persons (police, staff)
are identified by having minimal centroid movement over STATIONARY_FRAMES
consecutive detections and are excluded from the passenger count.
"""
from collections import defaultdict, deque

STATIONARY_FRAMES  = 25   # frames a person must be still to be flagged as staff
MOVEMENT_TOLERANCE = 18   # pixels — max displacement to be considered stationary


class StationaryFilter:
    def __init__(self):
        # tid -> deque of (cx, cy) positions
        self._history: dict[int, deque] = defaultdict(lambda: deque(maxlen=STATIONARY_FRAMES))
        self._flagged: set[int] = set()

    def update(self, tid: int, cx: int, cy: int):
        self._history[tid].append((cx, cy))
        hist = self._history[tid]
        if len(hist) < STATIONARY_FRAMES:
            return
        xs = [p[0] for p in hist]
        ys = [p[1] for p in hist]
        if (max(xs) - min(xs)) < MOVEMENT_TOLERANCE and (max(ys) - min(ys)) < MOVEMENT_TOLERANCE:
            self._flagged.add(tid)
        else:
            self._flagged.discard(tid)

    def is_staff(self, tid: int) -> bool:
        return tid in self._flagged


def run_entrance_tracking(job_id: str, video_path: str, seconds: float | None, jobs: dict, outputs_dir, cv2, YOLO, CONF, IOU, IMGSZ):
    """Track passengers entering/exiting through an entrance, skipping stationary staff/police."""
    jobs[job_id]['status'] = 'running'

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        jobs[job_id] = {'status': 'error', 'error': f'Cannot open {video_path}'}
        return

    from pathlib import Path

    fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w            = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h            = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    max_frames   = int(seconds * fps) if seconds else total_frames

    # Counting line — placed at 40% height (entrance cameras often tilt down)
    line_y  = int(h * 0.40)
    every_n = 4

    stem     = Path(video_path).stem
    tmp_path = outputs_dir / f"{stem}_tmp.mp4"
    out_path = outputs_dir / f"{stem}_tracked.mp4"

    writer = cv2.VideoWriter(
        str(tmp_path),
        cv2.VideoWriter_fourcc(*"avc1"),
        max(1.0, fps / every_n),
        (w, h),
    )

    model = YOLO('yolov8s.pt')
    sf    = StationaryFilter()

    DIR_IN    = "in"
    DIR_OUT   = "out"
    COLOR_MAP = {DIR_IN: (0, 220, 0), DIR_OUT: (0, 0, 220)}
    COLOR_UNK = (220, 160, 0)
    COLOR_STAFF = (128, 128, 128)

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
                conf=CONF, iou=IOU, imgsz=IMGSZ, verbose=False,
                tracker="bytetrack.yaml",
            )
            boxes = results[0].boxes

            for box in boxes:
                if box.id is None:
                    continue
                tid = int(box.id)
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2

                sf.update(tid, cx, cy)
                centroids[tid].append(cy)

                # Skip stationary staff/police
                if sf.is_staff(tid):
                    continue

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
                if sf.is_staff(tid):
                    color = COLOR_STAFF
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 1)
                    cv2.putText(annotated, "STAFF", (x1, y1 - 4),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1, cv2.LINE_AA)
                else:
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

            cv2.putText(annotated, "ENTRANCE MODE | STAFF FILTERED",
                        (w - 340, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1, cv2.LINE_AA)

            writer.write(annotated)
            jobs[job_id]['total_in']  = total_in
            jobs[job_id]['total_out'] = total_out

        frame_idx += 1

    cap.release()
    writer.release()

    # Move moov atom to start so browsers can stream without seeking to end
    import subprocess, shutil
    ff = shutil.which("ffmpeg")
    if ff:
        subprocess.run(
            [ff, "-i", str(tmp_path), "-c", "copy", "-movflags", "faststart", "-y", str(out_path)],
            capture_output=True,
        )
        tmp_path.unlink(missing_ok=True)
    else:
        tmp_path.rename(out_path)

    jobs[job_id].update({
        'status': 'done',
        'total_in':  total_in,
        'total_out': total_out,
        'video_url': f'/api/outputs/{out_path.name}',
    })
