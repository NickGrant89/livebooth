const RESERVED = new Set([
  "admin",
  "api",
  "login",
  "signup",
  "help",
  "settings",
  "station",
  "embed",
  "dj",
  "stream",
  "wallet",
  "support",
  "guide",
  "dashboard",
  "go-live",
  "collab",
  "crate",
  "leaderboard",
  "achievements",
  "terms",
  "privacy",
  "vod",
  "forgot-password",
  "reset-password",
  "health",
]);

export function normalizeStationSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

export function validateStationSlug(slug: string): string | null {
  if (slug.length < 3) return "URL slug must be at least 3 characters";
  if (slug.length > 32) return "URL slug must be 32 characters or less";
  if (!/^[a-z0-9_-]+$/.test(slug)) {
    return "Slug: lowercase letters, numbers, hyphen, underscore only";
  }
  if (RESERVED.has(slug)) return "That slug is reserved — choose another";
  return null;
}
