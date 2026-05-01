#!/usr/bin/env bash
# Usage: ./preview.sh <video_path> [frame_pct 0.0-1.0]
# Example: ./preview.sh "../data/Camera/Train/В2-КАМ2_16-04-26_13-00-00.avi" 0.5

set -e
cd "$(dirname "$0")"

VIDEO="${1:?Usage: ./preview.sh <video_path> [frame_pct]}"
FRAME_PCT="${2:-0.5}"

source .venv/bin/activate
python3 scripts/preview_detection.py "$VIDEO" "$FRAME_PCT"
open "$(python3 -c "
from pathlib import Path
import sys
stem = Path('$VIDEO').stem
print(Path('outputs') / (stem + '_detection.jpg'))
")"
