import { APP_TAGLINE } from "./constants";

export type ShareKind = "live" | "profile" | "recap" | "vod" | "station";

export interface ShareContent {
  url: string;
  text: string;
  title: string;
}

/** Server-side base URL for metadata & OG */
export function getSiteUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return url || "http://localhost:3008";
}

/** Client-safe base URL */
export function getClientSiteUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return getSiteUrl();
}

export function buildShareUrl(
  path: string,
  opts?: { campaign?: string; content?: string; source?: string },
) {
  const base = getClientSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalized, base);
  url.searchParams.set("utm_source", opts?.source ?? "share");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", opts?.campaign ?? "livebooth_share");
  if (opts?.content) url.searchParams.set("utm_content", opts.content);
  return url.toString();
}

export function buildOgImageUrl(params: Record<string, string>) {
  const base = getSiteUrl();
  const q = new URLSearchParams(params);
  return `${base}/api/og?${q.toString()}`;
}

export function buildShareText(kind: ShareKind, data: {
  djName?: string;
  setTitle?: string;
  title?: string;
  tips?: number;
  peak?: number;
  stationName?: string;
}): string {
  switch (kind) {
    case "live":
      return `🎧 LIVE NOW — ${data.setTitle ?? "DJ set"}\n${data.djName ?? "DJ"} on LiveBooth · ${APP_TAGLINE}`;
    case "profile":
      return `Follow ${data.djName ?? "this DJ"} on LiveBooth — ${APP_TAGLINE}`;
    case "recap":
      return `${data.djName ?? "DJ"} just finished "${data.setTitle ?? data.title ?? "a set"}" on LiveBooth — ${data.tips ?? 0} DROP tipped · ${data.peak ?? 0} peak viewers. ${APP_TAGLINE}`;
    case "vod":
      return `Replay: "${data.setTitle ?? data.title ?? "DJ set"}" by ${data.djName ?? "DJ"} on LiveBooth`;
    case "station":
      return `🎙 ${data.stationName ?? "Radio"} on LiveBooth — live DJ streams · ${APP_TAGLINE}`;
    default:
      return `LiveBooth — ${APP_TAGLINE}`;
  }
}

export function getShareContent(
  kind: ShareKind,
  path: string,
  data: {
    djName?: string;
    setTitle?: string;
    title?: string;
    tips?: number;
    peak?: number;
    stationName?: string;
    username?: string;
  },
): ShareContent {
  const contentKey = data.username ?? path.replace(/\//g, "_");
  const url = buildShareUrl(path, { content: contentKey, campaign: `${kind}_share` });
  const text = `${buildShareText(kind, data)}\n${url}`;
  const title =
    kind === "live"
      ? `🔴 LIVE — ${data.djName ?? "DJ"}`
      : kind === "recap"
        ? `Set complete — ${data.setTitle ?? data.title ?? "LiveBooth"}`
        : kind === "station"
          ? data.stationName ?? "LiveBooth Station"
          : `${data.djName ?? "LiveBooth"}`;
  return { url, text, title };
}

export function shareToX(text: string, url: string) {
  const tweet = `${text.split("\n")[0]}\n${url}`;
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`,
    "_blank",
    "noopener,noreferrer,width=550,height=420",
  );
}

export function shareToWhatsApp(text: string, url: string) {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(`${text.split("\n").slice(0, 2).join("\n")}\n${url}`)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function shareToTelegram(text: string, url: string) {
  window.open(
    `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text.split("\n")[0])}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export async function nativeShare(title: string, text: string, url: string) {
  if (navigator.share) {
    await navigator.share({ title, text: text.split("\n")[0], url });
    return true;
  }
  return false;
}
