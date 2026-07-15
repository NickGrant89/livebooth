#!/bin/bash
# Process remux queue + scan for idle un-remuxed recordings. Run via systemd.
set -euo pipefail

RTMP_DIR="${RTMP_DIR:-/opt/livebooth/rtmp-server}"
RECORDINGS="${RTMP_DIR}/recordings"
QUEUE="${RECORDINGS}/.remux-queue"
REMUX_BIN="${REMUX_BIN:-/usr/local/bin/livebooth-remux-recording.sh}"
IDLE_SEC="${REMUX_IDLE_SEC:-180}"

remux_largest_in_path() {
  local path_name="$1"
  local dir="${RECORDINGS}/${path_name}"
  [[ -d "$dir" ]] || return 0

  local best="" best_size=0 size f
  while IFS= read -r f; do
    [[ -f "$f" ]] || continue
    size=$(stat -c %s "$f" 2>/dev/null || stat -f %z "$f")
    if (( size > best_size )); then
      best="$f"
      best_size=$size
    fi
  done < <(find "$dir" -maxdepth 1 -type f \( -name '*.mp4' -o -name '*.fmp4' \) ! -name '*.remuxing*')

  if [[ -z "$best" || -f "${best}.remuxed" ]]; then
    return 0
  fi

  local mtime now age
  mtime=$(stat -c %Y "$best" 2>/dev/null || stat -f %m "$best")
  now=$(date +%s)
  age=$((now - mtime))
  if (( age < IDLE_SEC )); then
    return 0
  fi

  echo "[remux-watcher] remux ${best}"
  REMUX_FORCE=1 "${REMUX_BIN}" "$best" < /dev/null || echo "[remux-watcher] failed ${best}" >&2
}

process_queue() {
  [[ -f "$QUEUE" ]] || return 0
  local tmp="${QUEUE}.processing"
  mv "$QUEUE" "$tmp" 2>/dev/null || return 0

  local now path_name queued_at
  now=$(date +%s)
  while read -r path_name queued_at; do
    [[ -n "$path_name" ]] || continue
    queued_at="${queued_at:-0}"
    if (( now - queued_at < IDLE_SEC )); then
      echo "${path_name} ${queued_at}" >> "${QUEUE}"
      continue
    fi
    remux_largest_in_path "$path_name"
  done < "$tmp"
  rm -f "$tmp"
}

scan_all() {
  local dir
  for dir in "${RECORDINGS}/live/"*; do
    [[ -d "$dir" ]] || continue
    remux_largest_in_path "live/$(basename "$dir")"
  done
}

while true; do
  process_queue
  scan_all
  sleep 30
done
