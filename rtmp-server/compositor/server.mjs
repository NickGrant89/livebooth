#!/usr/bin/env node
/**
 * LiveBooth collab compositor — mixes host + partner RTMP into one synced output.
 *
 * POST /start  { hostKey, partnerKey, outputKey }
 * POST /stop   { outputKey }
 * GET  /health
 *
 * Auth: X-Compositor-Secret header (COMPOSITOR_SECRET env)
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = Number(process.env.COMPOSITOR_PORT ?? 8090);
const SECRET = process.env.COMPOSITOR_SECRET ?? "";
const RTMP_BASE = (process.env.MEDIAMTX_RTMP_URL ?? "rtmp://127.0.0.1:1935/live").replace(/\/$/, "");
const API_BASE = (process.env.MEDIAMTX_API_URL ?? "http://127.0.0.1:9997").replace(/\/$/, "");

type Session = {
  outputKey: string;
  hostKey: string;
  partnerKey: string;
  process: ChildProcess | null;
  restarting: boolean;
  stopRequested: boolean;
};

const sessions = new Map<string, Session>();

function log(msg: string, extra?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  console.log(`[compositor ${ts}] ${msg}`, extra ? JSON.stringify(extra) : "");
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function authorized(req: IncomingMessage): boolean {
  if (!SECRET) return true;
  return req.headers["x-compositor-secret"] === SECRET;
}

async function pathReady(pathName: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/v3/paths/get/${encodeURIComponent(pathName)}`);
    if (!res.ok) return false;
    const data = (await res.json()) as { ready?: boolean; sourceReady?: boolean };
    return Boolean(data.ready ?? data.sourceReady);
  } catch {
    return false;
  }
}

async function waitForPath(pathName: string, timeoutMs = 90_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await pathReady(pathName)) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

function buildFfmpegArgs(hostKey: string, partnerKey: string, outputKey: string): string[] {
  const hostUrl = `${RTMP_BASE}/${hostKey}`;
  const partnerUrl = `${RTMP_BASE}/${partnerKey}`;
  const outUrl = `${RTMP_BASE}/${outputKey}`;

  const filter = [
    "[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1[v0]",
    "[1:v]scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2,setsar=1[v1]",
    "[v0][v1]overlay=W-w-16:H-h-16[vout]",
    "[0:a][1:a]amix=inputs=2:duration=longest:dropout_transition=2:normalize=0[aout]",
  ].join(";");

  return [
    "-hide_banner",
    "-loglevel",
    "warning",
    "-fflags",
    "+genpts",
    "-thread_queue_size",
    "512",
    "-i",
    hostUrl,
    "-thread_queue_size",
    "512",
    "-i",
    partnerUrl,
    "-filter_complex",
    filter,
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-profile:v",
    "main",
    "-g",
    "60",
    "-keyint_min",
    "60",
    "-sc_threshold",
    "0",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-f",
    "flv",
    outUrl,
  ];
}

function launchFfmpeg(session: Session) {
  if (session.stopRequested) return;

  const args = buildFfmpegArgs(session.hostKey, session.partnerKey, session.outputKey);
  log("starting ffmpeg", { outputKey: session.outputKey });

  const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
  session.process = proc;

  proc.stderr?.on("data", (buf: Buffer) => {
    const line = buf.toString().trim();
    if (line) log("ffmpeg", { outputKey: session.outputKey, line: line.slice(0, 300) });
  });

  proc.on("exit", (code, signal) => {
    session.process = null;
    log("ffmpeg exited", { outputKey: session.outputKey, code, signal });
    if (session.stopRequested || !sessions.has(session.outputKey)) return;
    if (session.restarting) return;
    session.restarting = true;
    setTimeout(async () => {
      session.restarting = false;
      if (session.stopRequested || !sessions.has(session.outputKey)) return;
      const hostOk = await pathReady(`live/${session.hostKey}`);
      const partnerOk = await pathReady(`live/${session.partnerKey}`);
      if (hostOk && partnerOk) {
        launchFfmpeg(session);
      } else {
        log("inputs offline, stopping session", { outputKey: session.outputKey });
        sessions.delete(session.outputKey);
      }
    }, 3000);
  });
}

async function startSession(hostKey: string, partnerKey: string, outputKey: string) {
  if (sessions.has(outputKey)) {
    const existing = sessions.get(outputKey)!;
    if (existing.hostKey === hostKey && existing.partnerKey === partnerKey) {
      return { ok: true, alreadyRunning: true };
    }
    stopSession(outputKey);
  }

  const hostReady = await waitForPath(`live/${hostKey}`);
  const partnerReady = await waitForPath(`live/${partnerKey}`);
  if (!hostReady || !partnerReady) {
    return { ok: false, error: "Host or partner RTMP feed not ready within timeout" };
  }

  const session: Session = {
    outputKey,
    hostKey,
    partnerKey,
    process: null,
    restarting: false,
    stopRequested: false,
  };
  sessions.set(outputKey, session);
  launchFfmpeg(session);

  return { ok: true, alreadyRunning: false };
}

function stopSession(outputKey: string) {
  const session = sessions.get(outputKey);
  if (!session) return { ok: true, found: false };
  session.stopRequested = true;
  if (session.process && !session.process.killed) {
    session.process.kill("SIGTERM");
    setTimeout(() => {
      if (session.process && !session.process.killed) session.process.kill("SIGKILL");
    }, 5000);
  }
  sessions.delete(outputKey);
  return { ok: true, found: true };
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true, sessions: sessions.size });
  }

  if (!authorized(req)) {
    return json(res, 401, { error: "Unauthorized" });
  }

  if (req.method === "POST" && url.pathname === "/start") {
    try {
      const body = JSON.parse(await readBody(req)) as {
        hostKey?: string;
        partnerKey?: string;
        outputKey?: string;
      };
      if (!body.hostKey || !body.partnerKey || !body.outputKey) {
        return json(res, 400, { error: "hostKey, partnerKey, outputKey required" });
      }
      const result = await startSession(body.hostKey, body.partnerKey, body.outputKey);
      return json(res, result.ok ? 200 : 503, result);
    } catch (e) {
      return json(res, 500, { error: e instanceof Error ? e.message : "Start failed" });
    }
  }

  if (req.method === "POST" && url.pathname === "/stop") {
    try {
      const body = JSON.parse(await readBody(req)) as { outputKey?: string };
      if (!body.outputKey) return json(res, 400, { error: "outputKey required" });
      const result = stopSession(body.outputKey);
      return json(res, 200, result);
    } catch (e) {
      return json(res, 500, { error: e instanceof Error ? e.message : "Stop failed" });
    }
  }

  if (req.method === "GET" && url.pathname === "/status") {
    const outputKey = url.searchParams.get("outputKey");
    if (!outputKey) return json(res, 400, { error: "outputKey query required" });
    const session = sessions.get(outputKey);
    const pathOk = await pathReady(`live/${outputKey}`);
    return json(res, 200, {
      running: Boolean(session),
      outputReady: pathOk,
      hostKey: session?.hostKey,
      partnerKey: session?.partnerKey,
    });
  }

  json(res, 404, { error: "Not found" });
}

createServer(handleRequest).listen(PORT, "0.0.0.0", () => {
  log(`listening on :${PORT}`, { rtmpBase: RTMP_BASE, apiBase: API_BASE });
});

process.on("SIGTERM", () => {
  for (const key of [...sessions.keys()]) stopSession(key);
  process.exit(0);
});
