#!/usr/bin/env node
/**
 * VPS clip export — ffmpeg vertical MP4 for TikTok/Reels (live tail + VOD segments).
 * POST /export with Authorization: Bearer $RECORDINGS_CLIP_SECRET
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.CLIP_SERVICE_PORT ?? 8093);
const ROOT = process.env.RECORDINGS_ROOT ?? "/recordings";
const SECRET = process.env.RECORDINGS_CLIP_SECRET ?? "";
const SCRIPT = path.join(__dirname, "export-social-clip.sh");
const MAX_DURATION = 90;
const CLIP_TTL_MS = 24 * 60 * 60 * 1000;

function authOk(req) {
  if (!SECRET) return false;
  const h = req.headers.authorization ?? "";
  return h === `Bearer ${SECRET}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function largestRecordingFile(ingestKey) {
  const dir = path.join(ROOT, "live", ingestKey);
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => (f.endsWith(".mp4") || f.endsWith(".fmp4")) && !f.includes(".remuxing"))
    .map((name) => {
      try {
        const st = fs.statSync(path.join(dir, name));
        return { name, size: st.size, mtime: st.mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  if (files.length === 0) return null;
  files.sort((a, b) => b.size - a.size || b.mtime - a.mtime);
  return path.join(dir, files[0].name);
}

function runExport(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("bash", [SCRIPT, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => {
      out += d;
    });
    proc.stderr.on("data", (d) => {
      err += d;
    });
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(err.trim() || `ffmpeg exit ${code}`));
      else resolve(out.trim());
    });
  });
}

function purgeOldClips() {
  const clipsDir = path.join(ROOT, "clips");
  if (!fs.existsSync(clipsDir)) return;
  const cutoff = Date.now() - CLIP_TTL_MS;
  for (const id of fs.readdirSync(clipsDir)) {
    const p = path.join(clipsDir, id);
    try {
      const st = fs.statSync(p);
      if (st.mtimeMs < cutoff) fs.rmSync(p, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

createServer(async (req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.url !== "/export" || req.method !== "POST") {
    res.writeHead(404);
    res.end("not found");
    return;
  }

  if (!authOk(req)) {
    res.writeHead(401);
    res.end("unauthorized");
    return;
  }

  try {
    const body = JSON.parse((await readBody(req)) || "{}");
    const ingestKey = String(body.ingestKey ?? "").trim();
    const streamId = String(body.streamId ?? "").trim();
    let durationSec = Number(body.durationSec ?? 30);
    const mode = body.mode === "live_tail" ? "live_tail" : "vod";
    let startSec = body.startSec != null ? Number(body.startSec) : null;

    if (!ingestKey.startsWith("lb_") && !ingestKey.startsWith("st_")) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid ingest key" }));
      return;
    }
    if (!Number.isFinite(durationSec) || durationSec < 5) durationSec = 30;
    durationSec = Math.min(MAX_DURATION, Math.round(durationSec));

    const input = largestRecordingFile(ingestKey);
    if (!input) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No recording file yet — start streaming from OBS first" }));
      return;
    }

    const clipId = randomUUID();
    const outDir = path.join(ROOT, "clips", clipId);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `clip-${durationSec}s.mp4`);
    const relativePath = `clips/${clipId}/clip-${durationSec}s.mp4`;

    const args = ["--input", input, "--output", outFile, "--duration", String(durationSec)];
    if (mode === "live_tail") {
      args.push("--live-tail");
    } else if (startSec != null && Number.isFinite(startSec) && startSec >= 0) {
      args.push("--start", String(startSec));
    }

    await runExport(args);
    purgeOldClips();

    const stat = fs.statSync(outFile);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        clipId,
        relativePath,
        filename: path.basename(outFile),
        sizeBytes: stat.size,
        durationSec,
        mode,
        streamId: streamId || undefined,
      }),
    );
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Clip export failed" }));
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`clip-service listening on ${PORT}, recordings=${ROOT}`);
});
