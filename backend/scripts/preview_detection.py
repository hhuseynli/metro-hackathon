"""
Preview person detection on a video file.
Saves an annotated frame with bounding boxes and blurred faces to outputs/.
Usage: python scripts/preview_detection.py <video_path> [frame_offset_pct]
"""
import sys
import cv2
import numpy as np
from pathlib import Path

CONF = 0.15
IOU = 0.7
HEAD_FRACTION = 0.28  # top portion of bounding box treated as face


def blur_faces(frame: np.ndarray, boxes) -> np.ndarray:
    out = frame.copy()
    for box in boxes:
        x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
        head_h = int((y2 - y1) * HEAD_FRACTION)
        fy1, fy2 = y1, y1 + head_h
        fx1, fx2 = x1, x2
        # clamp to frame bounds
        fy1, fy2 = max(0, fy1), min(frame.shape[0], fy2)
        fx1, fx2 = max(0, fx1), min(frame.shape[1], fx2)
        if fy2 > fy1 and fx2 > fx1:
            roi = out[fy1:fy2, fx1:fx2]
            blurred = cv2.GaussianBlur(roi, (51, 51), 20)
            out[fy1:fy2, fx1:fx2] = blurred
    return out


def main():
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ultralytics not installed — run: pip install ultralytics")
        sys.exit(1)

    if len(sys.argv) < 2:
        print("Usage: python scripts/preview_detection.py <video_path> [frame_pct]")
        sys.exit(1)

    video_path = sys.argv[1]
    frame_pct = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Cannot open: {video_path}")
        sys.exit(1)

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * frame_pct))
    ret, frame = cap.read()
    cap.release()

    if not ret:
        print("Failed to read frame")
        sys.exit(1)

    model = YOLO("yolov8n.pt")
    results = model(frame, classes=[0], conf=CONF, iou=IOU, verbose=False)
    boxes = results[0].boxes

    annotated = results[0].plot()
    if "--blur" in sys.argv:
        annotated = blur_faces(annotated, boxes)

    out_dir = Path(__file__).parent.parent / "outputs"
    out_dir.mkdir(exist_ok=True)
    stem = Path(video_path).stem
    out_path = out_dir / f"{stem}_detection.jpg"
    cv2.imwrite(str(out_path), annotated)

    print(f"Persons detected : {len(boxes)}")
    print(f"Saved            : {out_path}")
    print(f"Open             : open {out_path}")


if __name__ == "__main__":
    main()
