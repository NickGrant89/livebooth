import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** In-memory sliding window — use Redis/Upstash on multi-instance production. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Too many requests. Try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
  id?: string,
) {
  const ip = getClientIp(request);
  const key = `${scope}:${id ?? ip}`;
  const result = rateLimit(key, limit, windowMs);
  if (!result.ok) return rateLimitResponse(result.retryAfterSec);
  return null;
}

/** Rate limit server actions (login/signup) using request headers. Returns true if limited. */
export function isRateLimitedFromHeaders(
  headerStore: Headers,
  scope: string,
  limit: number,
  windowMs: number,
): boolean {
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "unknown";
  const result = rateLimit(`${scope}:${ip}`, limit, windowMs);
  return !result.ok;
}
