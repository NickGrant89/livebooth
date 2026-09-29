#!/bin/bash
# Copy kept in sync with scripts/export-social-clip.sh (Docker image).
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

CROP_MODE="${CLIP_CROP_MODE:-fit}"
if [[ "$CROP_MODE" == "center" ]]; then
  VF="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1"
else
  VF="scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x030304,setsar=1"
fi

FFMPEG_ARGS=(-nostdin -y -loglevel warning)

if [[ "$LIVE_TAIL" == "1" ]]; then
  FFMPEG_ARGS+=(-fflags +genpts -sseof "-${DURATION}" -i "$INPUT" -t "$DURATION")
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

if command -v ffprobe >/dev/null 2>&1; then
  dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUTPUT" 2>/dev/null || true)
  if [[ -n "$dims" && "$dims" != "1080,1920" ]]; then
    echo "Clip dimensions unexpected ($dims), expected 1080,1920" >&2
    exit 1
  fi
fi

echo "$OUTPUT"
