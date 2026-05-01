import cv2
import json

N_ZONES = 5

try:
    from ultralytics import YOLO
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from scripts.yolo_utils import CONF, IOU, IMGSZ
    _model = None

    def _get_model():
        global _model
        if _model is None:
            _model = YOLO('yolov8s.pt')
        return _model

    def get_zone_counts(frame, n_zones=N_ZONES, model=None):
        if model is None:
            model = _get_model()
        _, w = frame.shape[:2]
        zone_width = w // n_zones
        results = model(frame, classes=[0], conf=CONF, iou=IOU, imgsz=IMGSZ, verbose=False)
        zone_counts = {i: 0 for i in range(n_zones)}
        for box in results[0].boxes:
            x_center = float((box.xyxy[0][0] + box.xyxy[0][2]) / 2)
            zone = min(int(x_center // zone_width), n_zones - 1)
            zone_counts[zone] += 1
        return zone_counts

    YOLO_AVAILABLE = True

except ImportError:
    YOLO_AVAILABLE = False

    def get_zone_counts(frame, n_zones=N_ZONES, model=None):
        return {i: 0 for i in range(n_zones)}


def process_video(video_path: str, sample_every_n_frames: int = 30) -> list:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    model = _get_model() if YOLO_AVAILABLE else None
    results = []
    frame_idx = 0
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % sample_every_n_frames == 0:
            timestamp_sec = frame_idx / fps
            counts = get_zone_counts(frame, model=model)
            results.append({'timestamp_sec': timestamp_sec, 'zones': counts})
        frame_idx += 1

    cap.release()
    return results


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: python zone_detector.py <video_path>")
        sys.exit(1)
    video_path = sys.argv[1]
    data = process_video(video_path)
    output_path = 'zone_counts.json'
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Processed {len(data)} samples → {output_path}")
    if data:
        print("Sample:", data[0])
