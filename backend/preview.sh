#!/usr/bin/env bash
# Single frame : ./preview.sh <video_path> [frame_pct] [--blur]
# All frames   : ./preview.sh --all [frame_pct] [--blur]
# Full video   : ./preview.sh --video <video_path> [--every N] [--blur]

set -eo pipefail
cd "$(dirname "$0")"
source .venv/bin/activate

CAMERA_ROOT="../data/Camera"

_parse_common_args() {
    FRAME_PCT="0.5"
    BLUR_FLAG=""
    [[ "${1:-}" =~ ^[0-9] ]] && { FRAME_PCT="$1"; shift; }
    [[ "${1:-}" == "--blur" ]] && BLUR_FLAG="--blur"
}

if [[ "${1:-}" == "--video" ]]; then
    VIDEO="${2:?Usage: ./preview.sh --video <video_path> [--every N] [--blur]}"
    shift 2
    python3 scripts/analyze_video.py "$VIDEO" "$@"
    open "outputs/$(basename "$VIDEO" .avi)_tracked.mp4" 2>/dev/null || true

elif [[ "${1:-}" == "--all" ]]; then
    shift
    _parse_common_args "$@"

    echo "Processing all videos in $CAMERA_ROOT"
    echo "Frame position: $FRAME_PCT"
    echo "---"

    find "$CAMERA_ROOT" -name "*.avi" | sort | while IFS= read -r video; do
        folder=$(basename "$(dirname "$video")")
        out_dir="outputs/$folder"
        mkdir -p "$out_dir"
        echo "[$folder] $(basename "$video" .avi)"
        python3 scripts/preview_detection.py "$video" "$FRAME_PCT" $BLUR_FLAG \
            --outdir "$out_dir" 2>&1 | grep -E "Persons|Saved|Error|Cannot" || true
    done

    echo "---"
    echo "Done. Results in: outputs/"
    open outputs/

else
    VIDEO="${1:?Usage: ./preview.sh <video_path> [frame_pct] [--blur]  OR  ./preview.sh --all  OR  ./preview.sh --video <path>}"
    shift
    _parse_common_args "$@"

    python3 scripts/preview_detection.py "$VIDEO" "$FRAME_PCT" $BLUR_FLAG
    open "outputs/$(basename "$VIDEO" .avi)_detection.jpg" 2>/dev/null || true
fi
