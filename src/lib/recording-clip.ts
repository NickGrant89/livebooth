import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  findLatestRecordingFile,
  getRecordingsPublicBaseUrls,
  getRemoteRecordingFileUrl,
  isLocalRecordingEnabled,
  isRemoteRecordingEnabled,
} from "@/lib/vod-recording";

const LOCAL_RECORDINGS_DIR =
  process.env.RECORDINGS_DIR ?? path.join(process.cwd(), "rtmp-server/recordings");

const CLIP_SIGN_TTL_SEC = 60 * 60;

export type ClipExportMode = "live_tail" | "vod";

export type ClipExportRequest = {
  ingestKey: string;
  streamId: string;
  durationSec: number;
  mode: ClipExportMode;
  startSec?: number;
};

export type ClipExportResult = {
  relativePath: string;
  filename: string;
  sizeBytes: number;
  durationSec: number;
  mode: ClipExportMode;
};

function clipServiceConfigured(): boolean {
  return Boolean(process.env.RECORDINGS_CLIP_URL && process.env.RECORDINGS_CLIP_SECRET);
}

export function isServerClipExportAvailable(): boolean {
  return clipServiceConfigured() && (isRemoteRecordingEnabled() || isLocalRecordingEnabled());
}

/** Request MP4 clip from VPS ffmpeg service. */
export async function requestServerClipExport(
  req: ClipExportRequest,
): Promise<ClipExportResult> {
  const baseUrl = process.env.RECORDINGS_CLIP_URL?.replace(/\/$/, "");
  const secret = process.env.RECORDINGS_CLIP_SECRET;
  if (!baseUrl || !secret) {
    throw new Error("Server clip export is not configured on this deployment");
  }

  const res = await fetch(`${baseUrl}/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      ingestKey: req.ingestKey,
      streamId: req.streamId,
      durationSec: req.durationSec,
      mode: req.mode,
      startSec: req.startSec,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const data = (await res.json()) as {
    error?: string;
    relativePath?: string;
    filename?: string;
    sizeBytes?: number;
    durationSec?: number;
    mode?: ClipExportMode;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "Clip export failed");
  }
  if (!data.relativePath || !data.filename) {
    throw new Error("Invalid clip service response");
  }

  return {
    relativePath: data.relativePath,
    filename: data.filename,
    sizeBytes: data.sizeBytes ?? 0,
    durationSec: data.durationSec ?? req.durationSec,
    mode: data.mode ?? req.mode,
  };
}

function signSecret(): string {
  return process.env.RECORDINGS_CLIP_SECRET ?? process.env.AUTH_SECRET ?? "dev-clip-sign";
}

export function signClipDownloadToken(streamId: string, relativePath: string): string {
  const exp = Math.floor(Date.now() / 1000) + CLIP_SIGN_TTL_SEC;
  const payload = `${streamId}:${relativePath}:${exp}`;
  const sig = crypto.createHmac("sha256", signSecret()).update(payload).digest("base64url");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyClipDownloadToken(
  streamId: string,
  relativePath: string,
  token: string,
): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [sid, rel, expStr, sig] = decoded.split(":");
    if (sid !== streamId || rel !== relativePath || !expStr || !sig) return false;
    const exp = parseInt(expStr, 10);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
    const payload = `${sid}:${rel}:${expStr}`;
    const expected = crypto.createHmac("sha256", signSecret()).update(payload).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export function resolveLocalClipFile(relativePath: string): string | null {
  if (relativePath.includes("..") || !relativePath.startsWith("clips/")) return null;
  const full = path.join(LOCAL_RECORDINGS_DIR, ...relativePath.split("/"));
  if (!fs.existsSync(full)) return null;
  return full;
}

export async function fetchRemoteClip(relativePath: string): Promise<Response | null> {
  if (relativePath.includes("..") || !relativePath.startsWith("clips/")) return null;
  for (const base of getRecordingsPublicBaseUrls()) {
    const url = getRemoteRecordingFileUrl(relativePath, base);
    if (!url) continue;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return res;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Dev-only: run export locally when RECORDINGS_DIR has files and no clip URL. */
export async function exportClipLocally(req: ClipExportRequest): Promise<ClipExportResult> {
  const { spawn } = await import("node:child_process");
  const script = path.join(process.cwd(), "scripts/export-social-clip.sh");
  if (!fs.existsSync(script)) {
    throw new Error("Local clip script missing");
  }
  const filename = findLatestRecordingFile(req.ingestKey);
  if (!filename) throw new Error("No recording file found");
  const input = path.join(LOCAL_RECORDINGS_DIR, "live", req.ingestKey, filename);
  const clipId = crypto.randomUUID();
  const relativePath = `clips/${clipId}/clip-${req.durationSec}s.mp4`;
  const outFile = path.join(LOCAL_RECORDINGS_DIR, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  const args = [
    script,
    "--input",
    input,
    "--output",
    outFile,
    "--duration",
    String(req.durationSec),
  ];
  if (req.mode === "live_tail") args.push("--live-tail");
  else if (req.startSec != null) args.push("--start", String(req.startSec));

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("bash", args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    proc.stderr.on("data", (d) => {
      err += d;
    });
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(err.trim() || "Local clip export failed"));
      else resolve();
    });
  });

  const stat = fs.statSync(outFile);
  return {
    relativePath,
    filename: path.basename(outFile),
    sizeBytes: stat.size,
    durationSec: req.durationSec,
    mode: req.mode,
  };
}

export async function exportServerClip(req: ClipExportRequest): Promise<ClipExportResult> {
  if (clipServiceConfigured()) {
    return requestServerClipExport(req);
  }
  if (isLocalRecordingEnabled() && fs.existsSync(path.join(process.cwd(), "scripts/export-social-clip.sh"))) {
    return exportClipLocally(req);
  }
  throw new Error(
    "Server MP4 clips need RECORDINGS_CLIP_URL on Vercel and clip-service on the VPS — see docs/CLIPS.md",
  );
}
