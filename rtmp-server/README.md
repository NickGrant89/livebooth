# LiveBooth RTMP Server

Self-hosted RTMP ingest + HLS playback for local development (and small deployments). Uses [MediaMTX](https://github.com/bluenviron/mediamtx) — no custom code required.

## Quick start

**Requires [Docker](https://docs.docker.com/get-docker/)**

```bash
# From repo root
npm run rtmp:start

# Or from this folder
docker compose up -d
```

Then add to your root `.env`:

```env
RTMP_SERVER_URL="rtmp://127.0.0.1:1935/live"
HLS_SERVER_URL="http://127.0.0.1:8888"
```

Restart the Next.js app (`npm run dev:clean`), go live as a DJ, and use the credentials shown on screen.

## OBS setup

| Field | Value |
|-------|--------|
| Service | Custom |
| Server | `rtmp://127.0.0.1:1935/live` |
| Stream key | Copy from Go Live / Dashboard (e.g. `lb_abc123...`) |

Click **Start Streaming** in OBS. Open your stream page in LiveBooth — you should see your video after a few seconds (HLS needs ~2–4s to buffer).

## How it connects to LiveBooth

```
OBS  --RTMP-->  MediaMTX :1935  --HLS-->  :8888  <--  LiveBooth player
                      |
              POST /api/rtmp/auth  (publish must match live ingest key)
              /live/{ingestKey}/index.m3u8
```

When `HLS_SERVER_URL` is set (and no `LIVEPEER_API_KEY`), `src/lib/streaming.ts` sets each stream's playback URL to:

`http://127.0.0.1:8888/live/{ingestKey}/index.m3u8`

### VOD recordings (Sprint 1)

MediaMTX writes **fmp4** files to `rtmp-server/recordings/live/{ingestKey}/` when a DJ streams.

When the DJ ends the set, LiveBooth resolves the latest file and sets `vodUrl` to `/api/vod/file/live/{ingestKey}/{file}.fmp4`.

**Requirements:**

1. `npm run rtmp:start` (Docker volume mounts `./recordings`)
2. App can read `RECORDINGS_DIR` (default `rtmp-server/recordings`)
3. Restart RTMP after pulling config changes: `npm run rtmp:stop && npm run rtmp:start`

Demo/Mux replays still work without recordings — only **your OBS feed** gets real VOD files.

### Publish authentication

MediaMTX calls `POST /api/rtmp/auth` before accepting RTMP publish.

| `RTMP_AUTH_ENABLED` | Behavior |
|---------------------|----------|
| `false` (default) | Any publish allowed — fine for LAN dev |
| `true` | Only `lb_…` keys for **live** streams in the DB |

On the **Next.js host**, set `RTMP_AUTH_ENABLED=true` when RTMP is on the public internet.

Docker uses `host.docker.internal:3008` (see `docker-compose.yml`). The app must be running when OBS connects.

Test: `npm run smoke:beta` (step 8 hits the auth endpoint).

## Commands

| Command | Description |
|---------|-------------|
| `npm run rtmp:start` | Start MediaMTX in Docker |
| `npm run rtmp:stop` | Stop container |
| `npm run rtmp:logs` | Follow server logs |
| `npm run rtmp:status` | List active streams (API) |

## Ports

| Port | Purpose |
|------|---------|
| 1935 | RTMP ingest |
| 8888 | HLS HTTP |
| 9997 | MediaMTX API |

## Troubleshooting

**Port 1935 already in use** — another RTMP server or old container:

```bash
npm run rtmp:stop
docker ps -a | grep livebooth-rtmp
```

**Black screen in browser** — confirm OBS is streaming (green bitrate). Wait a few seconds for HLS segments. Check logs: `npm run rtmp:logs`.

**CORS errors** — `hlsAllowOrigin: '*'` is set in `mediamtx.yml` for local dev.

**Publish rejected** — set `RTMP_AUTH_ENABLED=true` on the app and go live first so the ingest key exists in the DB. With auth off, any publish is allowed.

**Production** — use `RTMP_AUTH_ENABLED=true` + HTTPS in front of HLS. Full VPS guide: [RTMP-VPS-DEPLOY.md](../docs/RTMP-VPS-DEPLOY.md).

Files: `docker-compose.production.yml`, `mediamtx.production.yml`, `Caddyfile.example`.

## Priority order in LiveBooth

1. **Livepeer** — if `LIVEPEER_API_KEY` is set  
2. **Local RTMP** — if `HLS_SERVER_URL` + `RTMP_SERVER_URL` are set  
3. **Demo** — Mux test HLS (no real ingest)
