# Server MP4 clips (live tail + VOD)

LiveBooth can export **9:16 H.264 MP4** clips on the VPS for TikTok/Reels upload limits. While you are live, **“Clip this moment”** takes the last 30–60 seconds from the growing OBS recording file. On replay, **VOD mode** cuts from a timestamp.

## Architecture

1. Browser → `POST /api/streams/:id/clip` (Vercel, authenticated, rate-limited)
2. Vercel → `POST {RECORDINGS_CLIP_URL}/export` with `Authorization: Bearer {RECORDINGS_CLIP_SECRET}`
3. **clip-service** (Docker on VPS) runs `ffmpeg` via `export-social-clip.sh`
4. Output: `recordings/clips/{uuid}/clip-{N}s.mp4`
5. Download via signed URL → `/api/streams/:id/clip/download` (proxies from CDN or local dev)

## Vercel env

| Variable | Example |
|----------|---------|
| `RECORDINGS_CLIP_URL` | `https://hls.livebooth.uk/_clip` |
| `RECORDINGS_CLIP_SECRET` | Same long random string as on the VPS |

Also keep `RECORDINGS_PUBLIC_URL`, `HLS_SERVER_URL`, and `RTMP_SERVER_URL` set (same as replay).

## VPS deploy

From the repo on the droplet (`/opt/livebooth` or your path):

```bash
bash scripts/vps-install-clip-service.sh
```

Or manually:

1. Add `RECORDINGS_CLIP_SECRET=...` to `rtmp-server/.env` (match Vercel).
2. `docker compose -f rtmp-server/docker-compose.production.yml up -d --build clip-service`
3. Extend Caddy for `hls.livebooth.uk` (see `rtmp-server/Caddyfile.example` `/_clip/*` block).
4. `caddy reload` or restart Caddy.

Health check (on VPS): `curl -s http://127.0.0.1:8093/health`

## Local dev

Without `RECORDINGS_CLIP_URL`, if `RECORDINGS_DIR` has files and `scripts/export-social-clip.sh` exists, the API runs ffmpeg locally.

## API

```json
POST /api/streams/{streamId}/clip
{ "durationSec": 30, "mode": "live_tail" }
{ "durationSec": 60, "mode": "vod", "startSec": 120 }
```

Response includes `downloadUrl` (MP4 attachment).

## Notes

- Live tail needs an active recording under `recordings/live/{ingestKey}/` (OBS publishing).
- Default export **letterboxes** the full OBS frame into 9:16 (best for wide browser/desktop captures). Set `CLIP_CROP_MODE=center` on clip-service for center zoom crop instead.
- Clips on disk are purged after ~24h by clip-service.
- Client-side WebM export in the replay UI still works when server export is unavailable.
