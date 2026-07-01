# LiveBooth

Live streaming + tipping platform — **$DROP** on **VeChain**. Tip the drop, unlock track IDs, earn achievements.

**Planned domain:** [livebooth.uk](https://livebooth.uk)

**Self-hosted RTMP (DigitalOcean $12/mo — easiest):** [docs/RTMP-DIGITALOCEAN-QUICKSTART.md](docs/RTMP-DIGITALOCEAN-QUICKSTART.md)  
**Self-hosted RTMP (Hetzner ~€5/mo):** [docs/RTMP-HETZNER-QUICKSTART.md](docs/RTMP-HETZNER-QUICKSTART.md)  
**Self-hosted RTMP (Oracle UK free):** [docs/RTMP-ORACLE-UK-QUICKSTART.md](docs/RTMP-ORACLE-UK-QUICKSTART.md)

## Launch this week

1. `npm run launch:check` — pre-deploy checklist  
2. [docs/PRODUCTION-DEPLOY.md](docs/PRODUCTION-DEPLOY.md) — Neon + Vercel + DNS  
3. [docs/SOFT-LAUNCH.md](docs/SOFT-LAUNCH.md) — onboard 5–10 creators  

## Quick start (local)

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev:clean
```

Open [http://localhost:3008](http://localhost:3008)

### Local demo for friends (same Wi‑Fi)

```bash
npm run demo:setup   # migrate, seed, LAN URL
npm run demo:start   # listen on 0.0.0.0 — share the printed link
```

Full guide: [docs/LOCAL-DEMO.md](docs/LOCAL-DEMO.md)

**Beta with remote testers:** [docs/BETA-LAUNCH.md](docs/BETA-LAUNCH.md) (LAN → tunnel → Vercel hosted).

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Fan | demo@livebooth.local | password123 |
| DJ | neonpulse@livebooth.local | password123 |

## VeChain contracts (Phase 2)

```bash
# Get testnet VET from https://faucet.vecha.in/
# Add DEPLOYER_PRIVATE_KEY to .env
npm run contracts:deploy   # deploys to VeChain Testnet (chain 100010)
```

Connect **VeWorld** or MetaMask with VeChain Testnet (chain ID `100010`, RPC `https://testnet.veblocks.net`).

## Stack

- Next.js 16, Prisma/Postgres, wagmi + viem
- Solidity contracts: `DropToken`, `TipRouter`, `AchievementVault`
- VeChain Thor (EVM-compatible, low-fee tips)

## Local RTMP streaming

Stream from OBS to your own ingest server (Docker):

```bash
npm run rtmp:start          # MediaMTX on :1935 RTMP, :8888 HLS
# Add RTMP_SERVER_URL + HLS_SERVER_URL to .env (see .env.example)
npm run dev:clean
```

Full guide: [rtmp-server/README.md](rtmp-server/README.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:clean` | Kill port 3008, start dev server |
| `npm run rtmp:start` | Start local RTMP/HLS server (Docker) |
| `npm run rtmp:stop` | Stop RTMP server |
| `npm run launch:check` | Pre-deploy env + migration check |
| `npm run smoke:deploy` | Post-deploy smoke test (`SMOKE_BASE_URL=...`) |
| `npm run contracts:deploy` | Deploy to VeChain Testnet |

Design docs: [docs/design/](docs/design/)
