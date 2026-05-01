import cv2
import numpy as np

CONF = 0.10
IOU = 0.7
IMGSZ = 1280
HEAD_FRACTION = 0.28


def blur_faces(frame: np.ndarray, boxes) -> np.ndarray:
    out = frame.copy()
    for box in boxes:
        x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
        head_h = int((y2 - y1) * HEAD_FRACTION)
        fy1, fy2 = max(0, y1), min(frame.shape[0], y1 + head_h)
        fx1, fx2 = max(0, x1), min(frame.shape[1], x2)
        if fy2 > fy1 and fx2 > fx1:
            out[fy1:fy2, fx1:fx2] = cv2.GaussianBlur(out[fy1:fy2, fx1:fx2], (51, 51), 20)
    return out
