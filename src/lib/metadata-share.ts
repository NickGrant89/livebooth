import type { Metadata } from "next";
import { getSiteUrl, buildOgImageUrl } from "./share";
import { APP_TAGLINE } from "./constants";

export function streamMetadata(opts: {
  username: string;
  djName: string;
  title: string;
  genre?: string;
  peakViewers?: number;
}): Metadata {
  const base = getSiteUrl();
  const pageUrl = `${base}/stream/${opts.username}`;
  const description = `${opts.genre ? `${opts.genre} · ` : ""}${opts.peakViewers ?? 0} watching · ${APP_TAGLINE}`;
  const ogImage = buildOgImageUrl({
    type: "live",
    dj: opts.djName,
    title: opts.title,
    username: opts.username,
  });

  return {
    title: `🔴 LIVE — ${opts.djName} · ${opts.title}`,
    description,
    openGraph: {
      title: `🔴 LIVE — ${opts.djName}`,
      description: opts.title,
      url: pageUrl,
      siteName: "LiveBooth",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${opts.djName} live on LiveBooth` }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `🔴 LIVE — ${opts.djName}`,
      description: opts.title,
      images: [ogImage],
    },
  };
}

export function djProfileMetadata(opts: {
  username: string;
  displayName: string;
  bio?: string | null;
  isLive?: boolean;
}): Metadata {
  const base = getSiteUrl();
  const pageUrl = `${base}/dj/${opts.username}`;
  const ogImage = buildOgImageUrl({
    type: "profile",
    dj: opts.displayName,
    username: opts.username,
    live: opts.isLive ? "1" : "0",
  });

  return {
    title: `${opts.displayName}${opts.isLive ? " · LIVE" : ""} — LiveBooth`,
    description: opts.bio || `DJ on LiveBooth. ${APP_TAGLINE}`,
    openGraph: {
      title: opts.displayName,
      description: opts.bio || APP_TAGLINE,
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.displayName,
      description: opts.bio || APP_TAGLINE,
      images: [ogImage],
    },
  };
}

export function vodMetadata(opts: {
  streamId: string;
  djName: string;
  title: string;
}): Metadata {
  const base = getSiteUrl();
  const pageUrl = `${base}/vod/${opts.streamId}`;
  const ogImage = buildOgImageUrl({
    type: "vod",
    dj: opts.djName,
    title: opts.title,
  });

  return {
    title: `Replay — ${opts.title} · ${opts.djName}`,
    description: `Watch the set replay on LiveBooth. ${APP_TAGLINE}`,
    openGraph: {
      title: `Replay — ${opts.title}`,
      description: `${opts.djName} on LiveBooth`,
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogImage] },
  };
}

export function stationMetadata(opts: {
  slug: string;
  name: string;
  tagline?: string | null;
  followerCount?: number;
  isLive?: boolean;
}): Metadata {
  const base = getSiteUrl();
  const pageUrl = `${base}/station/${opts.slug}`;
  const description =
    opts.tagline ||
    `${opts.followerCount ?? 0} followers · Live DJ residencies on LiveBooth`;
  const ogImage = buildOgImageUrl({
    type: "station",
    dj: opts.name,
    title: opts.tagline || "Live radio on LiveBooth",
    username: opts.slug,
    live: opts.isLive ? "1" : "0",
  });

  return {
    title: `${opts.name}${opts.isLive ? " · LIVE" : ""} — LiveBooth Radio`,
    description,
    openGraph: {
      title: opts.name,
      description,
      url: pageUrl,
      siteName: "LiveBooth",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${opts.name} on LiveBooth` }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.name,
      description,
      images: [ogImage],
    },
  };
}
