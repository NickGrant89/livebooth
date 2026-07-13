#!/usr/bin/env node
/**
 * Local RTMP auth cache on the VPS — MediaMTX calls this instead of Vercel directly.
 * Avoids TLS/x509 issues inside the mediamtx container and caches valid lb_ keys.
 */
import { createServer } from "node:http";

const UPSTREAM = process.env.RTMP_AUTH_UPSTREAM ?? "https://livebooth.uk/api/rtmp/auth";
const PORT = Number(process.env.AUTH_PROXY_PORT ?? 8091);
const CACHE_TTL_MS = Number(process.env.AUTH_CACHE_TTL_MS ?? 120_000);

/** @type {Map<string, { ok: boolean, expires: number }>} */
const cache = new Map();

function extractIngestKey(payload) {
  const trim = (s) => (s ?? "").trim();
  const path = trim(payload.path);
  if (path) {
    const parts = path.split("/").filter(Boolean);
    const liveIdx = parts.indexOf("live");
    if (liveIdx >= 0 && parts[liveIdx + 1]) return parts[liveIdx + 1];
    const last = parts[parts.length - 1];
    if (last?.startsWith("lb_") || last?.startsWith("st_")) return last;
  }
  for (const candidate of [payload.user, payload.password]) {
    const val = trim(candidate);
    if (val.startsWith("lb_") || val.startsWith("st_")) return val;
  }
  const query = trim(payload.query);
  if (query) {
    const params = new URLSearchParams(query);
    for (const key of ["pass", "password", "key", "stream", "name"]) {
      const val = params.get(key);
      if (val?.startsWith("lb_") || val?.startsWith("st_")) return val;
    }
    for (const val of params.values()) {
      if (val.startsWith("lb_") || val.startsWith("st_")) return val;
    }
  }
  return null;
}

async function validatePublish(payload) {
  const action = payload.action ?? "";
  if (action !== "publish") return true;

  const ingestKey = extractIngestKey(payload);
  if (!ingestKey) return false;

  const now = Date.now();
  const cached = cache.get(ingestKey);
  if (cached && cached.expires > now) return cached.ok;

  const res = await fetch(UPSTREAM, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const ok = res.ok;
  if (ok) {
    cache.set(ingestKey, { ok: true, expires: now + CACHE_TTL_MS });
  }
  return ok;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

createServer(async (req, res) => {
  if (req.url !== "/auth" || req.method !== "POST") {
    res.writeHead(req.url === "/health" ? 200 : 404);
    res.end(req.url === "/health" ? "ok" : "not found");
    return;
  }
  try {
    const raw = await readBody(req);
    const payload = JSON.parse(raw);
    const ok = await validatePublish(payload);
    res.writeHead(ok ? 200 : 403, { "Content-Type": "text/plain" });
    res.end(ok ? "ok" : "forbidden");
  } catch (err) {
    console.error("[auth-proxy] error", err);
    res.writeHead(500);
    res.end("error");
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`[auth-proxy] listening on :${PORT} → ${UPSTREAM}`);
});
