export type SocialPlatform = "instagram" | "soundcloud" | "mixcloud" | "twitter" | "website";

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

export const SOCIAL_PLATFORM_META: {
  id: SocialPlatform;
  label: string;
  placeholder: string;
}[] = [
  { id: "instagram", label: "Instagram", placeholder: "@username or instagram.com/you" },
  { id: "soundcloud", label: "SoundCloud", placeholder: "soundcloud.com/you" },
  { id: "mixcloud", label: "Mixcloud", placeholder: "mixcloud.com/you" },
  { id: "twitter", label: "X / Twitter", placeholder: "x.com/you" },
  { id: "website", label: "Website", placeholder: "yourlink.com" },
];

const PLATFORMS = new Set<SocialPlatform>(SOCIAL_PLATFORM_META.map((p) => p.id));

export function parseSocialLinks(raw: string | null | undefined): SocialLinks {
  try {
    const parsed = JSON.parse(raw || "{}") as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: SocialLinks = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!PLATFORMS.has(key as SocialPlatform)) continue;
      if (typeof value === "string" && value.trim()) {
        out[key as SocialPlatform] = value.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function normalizeSocialUrl(platform: SocialPlatform, value: string): string {
  let v = value.trim();
  if (!v) return "";

  if (platform === "instagram") {
    v = v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\/?/i, "");
    v = v.replace(/\/$/, "");
    if (!v.includes(".") && !v.includes("/")) {
      return `https://instagram.com/${v}`;
    }
  }

  if (!/^https?:\/\//i.test(v)) {
    return `https://${v}`;
  }
  return v;
}

export function serializeSocialLinks(links: SocialLinks): string {
  const cleaned: SocialLinks = {};
  for (const meta of SOCIAL_PLATFORM_META) {
    const raw = links[meta.id];
    if (!raw?.trim()) continue;
    const normalized = normalizeSocialUrl(meta.id, raw);
    if (normalized) cleaned[meta.id] = normalized;
  }
  return JSON.stringify(cleaned);
}

export function socialLinksForDisplay(raw: string | null | undefined): SocialLinks {
  const parsed = parseSocialLinks(raw);
  const out: SocialLinks = {};
  for (const meta of SOCIAL_PLATFORM_META) {
    const val = parsed[meta.id];
    if (val) out[meta.id] = normalizeSocialUrl(meta.id, val);
  }
  return out;
}
