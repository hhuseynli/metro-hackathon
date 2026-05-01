"""
Full video analysis with person tracking and in/out counting.
Uses ByteTrack to assign persistent IDs and detects direction by crossing a virtual line.

Usage:
  python scripts/analyze_video.py <video_path> [--every N] [--seconds S] [--blur] [--outdir <dir>]

  --every N    process every Nth frame (default: 5)
  --seconds S  stop after S seconds of source video
"""
import sys
import cv2
from pathlib import Path
from collections import defaultdict, deque

sys.path.insert(0, str(Path(__file__).parent.parent))
from scripts.yolo_utils import CONF, IOU, IMGSZ, blur_faces

DIR_IN  = "in"
DIR_OUT = "out"

COLOR_MAP = {DIR_IN: (0, 220, 0), DIR_OUT: (0, 0, 220)}
COLOR_UNK = (220, 160, 0)


def draw_overlay(frame, total_in: int, total_out: int, line_y: int) -> None:
    h, w = frame.shape[:2]
    cv2.line(frame, (0, line_y), (w, line_y), (255, 255, 0), 2)
    cv2.putText(frame, "counting line", (8, line_y - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 0), 1, cv2.LINE_AA)

    panel_w, panel_h, pad = 190, 30, 8
    for i, (label, direction) in enumerate([(f"IN  {total_in:4d}", DIR_IN), (f"OUT {total_out:4d}", DIR_OUT)]):
        color = COLOR_MAP[direction]
        y0 = pad + i * (panel_h + pad)
        cv2.rectangle(frame, (pad, y0), (pad + panel_w, y0 + panel_h), (30, 30, 30), -1)
        cv2.putText(frame, label, (pad + 8, y0 + panel_h - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)


def annotate_boxes(frame, boxes, directions: dict) -> None:
    for box in boxes:
        if box.id is None:
            continue
        tid = int(box.id)
        x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
        color = COLOR_MAP.get(directions.get(tid), COLOR_UNK)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)


def main():
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ultralytics not installed — run: pip install ultralytics")
        sys.exit(1)

    args = sys.argv[1:]
    if not args:
        print("Usage: python scripts/analyze_video.py <video_path> [--every N] [--seconds S] [--blur] [--outdir <dir>]")
        sys.exit(1)

    video_path = args[0]
    do_blur = "--blur" in args
    every_n = 5
    max_seconds = None
    out_dir = None

    for i, a in enumerate(args[1:], 1):
        if a == "--every" and i + 1 < len(args):
            every_n = int(args[i + 1])
        elif a == "--seconds" and i + 1 < len(args):
            max_seconds = float(args[i + 1])
        elif a == "--outdir" and i + 1 < len(args):
            out_dir = Path(args[i + 1])

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Cannot open: {video_path}")
        sys.exit(1)

    fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w            = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h            = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    max_frames   = int(max_seconds * fps) if max_seconds else total_frames
    line_y       = h // 2

    if out_dir is None:
        out_dir = Path(__file__).parent.parent / "outputs"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{Path(video_path).stem}_tracked.mp4"

    writer = cv2.VideoWriter(
        str(out_path),
        cv2.VideoWriter_fourcc(*"avc1"),
        max(1.0, fps / every_n),
        (w, h),
    )

    model = YOLO("yolov8s.pt")

    centroids   = defaultdict(lambda: deque(maxlen=15))
    directions  = {}
    counted_ids = set()
    total_in = total_out = 0
    frame_idx = 0

    print(f"Video  : {video_path}")
    print(f"Frames : {max_frames}/{total_frames}  |  Every {every_n}th frame")
    print(f"Output : {out_path}")
    print()

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
            annotate_boxes(annotated, boxes, directions)
            if do_blur:
                annotated = blur_faces(annotated, boxes)
            draw_overlay(annotated, total_in, total_out, line_y)
            writer.write(annotated)

            pct = frame_idx / max(max_frames, 1) * 100
            print(f"\r  {pct:5.1f}%  frame {frame_idx}  IN={total_in}  OUT={total_out}  tracked={len(centroids)}   ",
                  end="", flush=True)

        frame_idx += 1

    cap.release()
    writer.release()
    print(f"\n\nFinal  : IN={total_in}  OUT={total_out}")
    print(f"Saved  : {out_path}")
    print(f"Open   : open \"{out_path}\"")


if __name__ == "__main__":
    main()
