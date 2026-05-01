"""
Preview person detection on a video file.
Saves an annotated frame with bounding boxes to outputs/.

Usage:
  python scripts/preview_detection.py <video_path> [frame_pct] [--blur] [--outdir <dir>]
"""
import sys
import cv2
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from scripts.yolo_utils import CONF, IOU, IMGSZ, blur_faces


def main():
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ultralytics not installed — run: pip install ultralytics")
        sys.exit(1)

    args = sys.argv[1:]
    if not args:
        print("Usage: python scripts/preview_detection.py <video_path> [frame_pct] [--blur] [--outdir <dir>]")
        sys.exit(1)

    video_path = args[0]
    frame_pct = 0.5
    do_blur = "--blur" in args
    out_dir = None

    for i, a in enumerate(args[1:], 1):
        if a == "--outdir" and i + 1 < len(args):
            out_dir = Path(args[i + 1])
        elif a.replace(".", "").isdigit():
            frame_pct = float(a)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Cannot open: {video_path}")
        sys.exit(1)

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * frame_pct))
    ret, frame = cap.read()
    cap.release()

    if not ret:
        print(f"Failed to read frame from: {video_path}")
        sys.exit(1)

    model = YOLO("yolov8s.pt")
    results = model(frame, classes=[0], conf=CONF, iou=IOU, imgsz=IMGSZ, verbose=False)
    boxes = results[0].boxes

    annotated = results[0].plot()
    if do_blur:
        annotated = blur_faces(annotated, boxes)

    if out_dir is None:
        out_dir = Path(__file__).parent.parent / "outputs"
    out_dir.mkdir(parents=True, exist_ok=True)

    out_path = out_dir / f"{Path(video_path).stem}_detection.jpg"
    cv2.imwrite(str(out_path), annotated)

    print(f"Persons detected : {len(boxes)}")
    print(f"Saved            : {out_path}")


if __name__ == "__main__":
    main()
