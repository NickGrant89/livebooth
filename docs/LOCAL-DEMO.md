# Local demo for friends (same Wi‑Fi)

Run LiveBooth on your Mac/PC so friends on the **same Wi‑Fi** can watch, tip, and chat — no cloud deploy needed.

---

## Quick start (5 minutes)

```bash
npm install
npm run demo:setup    # DB + seed + LAN URL in .env
npm run demo:start    # App on all interfaces :3008
```

**Share the URL** printed by setup (e.g. `http://192.168.1.42:3008`) — or tap **Copy link** in the cyan banner at the top of the app.

---

## What friends can do

| Action | How |
|--------|-----|
| **Watch live sets** | Home → tap a LIVE card (4 seeded DJs) |
| **Sign in as fan** | `demo@livebooth.local` / `password123` (500 DROP) |
| **Tip in chat** | Open a stream → tip button |
| **Unlock track ID** | 5 DROP — see what’s playing |
| **Sign up** | `/signup` — new fan or DJ account |
| **Try DJ booth** | `neonpulse@livebooth.local` / `password123` → Go Live |

No wallet or VeChain needed for the demo — everything uses the internal DROP ledger.

---

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Fan | demo@livebooth.local | password123 |
| DJ | neonpulse@livebooth.local | password123 |
| DJ | bassqueen@livebooth.local | password123 |
| Station | kxradio@livebooth.local | password123 |
| Admin | admin@livebooth.local | password123 |

---

## Optional: your real webcam/OBS stream

Seeded streams use a **demo video loop** (works everywhere). For your own camera:

1. **Install Docker** — [docker.com](https://docs.docker.com/get-docker/)
2. Start RTMP server:
   ```bash
   npm run rtmp:start
   ```
3. Re-run setup so HLS uses your LAN IP:
   ```bash
   npm run demo:setup
   npm run demo:start
   ```
4. Log in as DJ → **Go Live** → copy RTMP URL + stream key
5. **OBS** → Settings → Stream → Custom → paste server + key → **Start Streaming**
6. Share your booth: `http://YOUR_LAN_IP:3008/stream/yourusername`

---

## Troubleshooting

### Friends can’t open the link

- Same Wi‑Fi (guest networks often block device-to-device)
- macOS **Firewall**: System Settings → Network → Firewall → allow **Node** incoming
- Try your LAN IP in a browser on your phone first before sharing

### Video doesn’t play on friend’s phone

- **Demo streams** (Mux test URL): should work on any network
- **OBS/RTMP**: `HLS_SERVER_URL` in `.env` must use **LAN IP**, not `127.0.0.1` — re-run `npm run demo:setup`

### “Invalid login”

```bash
npm run db:seed
```

### Reset everything

```bash
npm run db:reset    # wipes DB and re-seeds
npm run demo:setup
```

### Port already in use

```bash
npm run demo:start    # kills :3008 then starts
```

---

## Host checklist (party night)

- [ ] `npm run demo:setup` + `npm run demo:start`
- [ ] Copy link from banner → AirDrop / group chat
- [ ] You: log in as **neonpulse** and go live (or use seeded live DJs)
- [ ] Friends: **demo** account or signup
- [ ] Show: tip → chat highlight, unlock track ID, leaderboard
- [ ] Optional: `/station/kxradio` for radio station demo

---

## What doesn’t work in local demo

- Email password reset (no mail server — use seeded accounts)
- Stripe buy-DROP (unless you add test keys)
- VeChain on-chain tips (unless contracts deployed)
- Access from outside your home network (use ngrok/Cloudflare tunnel if needed)

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run demo:setup` | Migrate, seed, set LAN URL + demo mode |
| `npm run demo:start` | Dev server on `0.0.0.0:3008` (LAN accessible) |
| `npm run dev:clean` | Localhost only (just you) |
| `npm run rtmp:start` | Docker RTMP/HLS for OBS |
