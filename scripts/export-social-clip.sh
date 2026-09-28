#!/bin/bash
# Export a vertical social clip (MP4 H.264 + AAC) from a MediaMTX recording or HLS URL.
# Usage:
#   export-social-clip.sh --input FILE --output OUT.mp4 --duration 30 [--start SEC] [--live-tail]
#   export-social-clip.sh --input FILE --output OUT.mp4 --duration 30 --live-tail
set -euo pipefail

INPUT=""
OUTPUT=""
DURATION="30"
START=""
LIVE_TAIL="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input) INPUT="$2"; shift 2 ;;
    --output) OUTPUT="$2"; shift 2 ;;
    --duration) DURATION="$2"; shift 2 ;;
    --start) START="$2"; shift 2 ;;
    --live-tail) LIVE_TAIL="1"; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$INPUT" || -z "$OUTPUT" ]]; then
  echo "Usage: --input PATH --output PATH --duration SEC [--start SEC] [--live-tail]" >&2
  exit 1
fi

if [[ ! -f "$INPUT" && "$INPUT" != http://* && "$INPUT" != https://* ]]; then
  echo "Input not found: $INPUT" >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg required" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"

VF="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"

FFMPEG_ARGS=(-nostdin -y -loglevel error)

if [[ "$LIVE_TAIL" == "1" ]]; then
  FFMPEG_ARGS+=(-sseof "-${DURATION}" -i "$INPUT" -t "$DURATION")
elif [[ -n "$START" ]]; then
  FFMPEG_ARGS+=(-ss "$START" -t "$DURATION" -i "$INPUT")
else
  FFMPEG_ARGS+=(-t "$DURATION" -i "$INPUT")
fi

ffmpeg "${FFMPEG_ARGS[@]}" \
  -vf "$VF" \
  -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -profile:v high -level 4.0 \
  -c:a aac -b:a 128k -ar 44100 -ac 2 \
  -movflags +faststart \
  "$OUTPUT" < /dev/null

if [[ ! -s "$OUTPUT" ]]; then
  echo "Clip export produced empty file" >&2
  exit 1
fi

echo "$OUTPUT"
