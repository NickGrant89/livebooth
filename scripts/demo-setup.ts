/**
 * One-shot setup for a local LAN demo (friends on same WiFi).
 * Usage: npm run demo:setup
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = 3008;
const ENV_PATH = path.join(ROOT, ".env");
const ENV_EXAMPLE = path.join(ROOT, ".env.example");
const LOCAL_POSTGRES_URL = "postgresql://livebooth:livebooth@localhost:5432/livebooth";

function getLanIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

function upsertEnv(key: string, value: string) {
  let content = fs.existsSync(ENV_PATH)
    ? fs.readFileSync(ENV_PATH, "utf8")
    : fs.readFileSync(ENV_EXAMPLE, "utf8");

  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) {
    content = content.replace(re, line);
  } else {
    content += `\n${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, content);
}

function run(cmd: string) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function readEnvValue(key: string): string | undefined {
  if (!fs.existsSync(ENV_PATH)) return undefined;
  const content = fs.readFileSync(ENV_PATH, "utf8");
  const match = content.match(new RegExp(`^${key}="([^"]*)"`, "m"));
  return match?.[1];
}

const lanIp = getLanIp();
const appUrl = `http://${lanIp}:${PORT}`;

console.log("\n╔══════════════════════════════════════════════════╗");
console.log("║  LiveBooth — local demo setup                    ║");
console.log("╚══════════════════════════════════════════════════╝\n");

if (!fs.existsSync(ENV_PATH)) {
  console.log("Creating .env from .env.example …");
  fs.copyFileSync(ENV_EXAMPLE, ENV_PATH);
}

upsertEnv("NEXT_PUBLIC_APP_URL", appUrl);
upsertEnv("NEXT_PUBLIC_DEMO_MODE", "true");

if (lanIp !== "127.0.0.1") {
  upsertEnv("HLS_SERVER_URL", `http://${lanIp}:8888`);
  upsertEnv("RTMP_SERVER_URL", `rtmp://${lanIp}:1935/live`);
  console.log(`RTMP/HLS set to LAN IP ${lanIp} (for OBS + friends on WiFi).`);
}

const currentDb = readEnvValue("DATABASE_URL") ?? "";
const usePostgres =
  currentDb.startsWith("postgresql://") ||
  currentDb.startsWith("postgres://") ||
  !currentDb.startsWith("file:");

if (usePostgres) {
  if (!currentDb.startsWith("postgres")) {
    console.log("Using local Docker Postgres for demo (recommended).");
    upsertEnv("DATABASE_URL", LOCAL_POSTGRES_URL);
  }
  run("docker compose up -d postgres");
  run("npm run db:wait");
} else {
  console.log(
    "DATABASE_URL is SQLite (legacy). Migrations are Postgres-only — set DATABASE_URL to a Postgres URL or remove file:./dev.db from .env.",
  );
}

run("npx prisma generate");
run("npx prisma migrate deploy");
run("SEED_DEMO_USERS=true npx tsx prisma/seed.ts");

console.log(`
╔══════════════════════════════════════════════════╗
║  Demo ready — share with friends on same WiFi   ║
╚══════════════════════════════════════════════════╝

  Host (you):     npm run demo:start
  Friends open:   ${appUrl}

  ── Try as a fan ──
  demo@livebooth.local / password123

  ── Try as a DJ ──
  neonpulse@livebooth.local / password123
  → 4 DJs are already LIVE with demo video on Discover

  ── Optional: real OBS stream ──
  npm run rtmp:start
  Go Live as neonpulse → OBS → Start Streaming

  ── Notes ──
  • Friends must be on the same Wi‑Fi (or VPN to your LAN)
  • macOS firewall: allow Node incoming connections if prompted
  • Full guide: docs/LOCAL-DEMO.md
`);
