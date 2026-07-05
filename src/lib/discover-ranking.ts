import {
  DISCOVER_FLAGSHIP_BOOST,
  DISCOVER_GENRE_NIGHT_BOOST,
  GENRE_NIGHTS,
} from "./constants";
import { getPromotionScoreBoost, isSponsoredHero } from "./promotion";

/** Live booth row used on Discover / home. */
export interface DiscoverLiveStream {
  id: string;
  title: string;
  genre: string;
  viewers: number;
  sessionTips: number;
  bpmRange?: string | null;
  startedAt?: Date | null;
  promotionTier?: string | null;
  promotedUntil?: Date | null;
  djUserId?: string;
  likeCount?: number;
  dj: {
    username: string;
    displayName: string;
    avatar: string;
  };
}

export type DiscoverRankOptions = {
  /** UTC weekday genre spotlight (from GENRE_NIGHTS). */
  genreNightGenre?: string;
  /** DJ user ids flagged as station flagship. */
  flagshipDjIds?: Set<string>;
};

/**
 * Engagement score for Discover ordering.
 * Peak viewers + session tips (DROP tipped this set).
 */
export function discoverScore(viewers: number, sessionTips: number): number {
  return viewers + sessionTips * 8;
}

export function finalDiscoverScore(
  stream: DiscoverLiveStream,
  options: DiscoverRankOptions = {},
): number {
  let score = discoverScore(stream.viewers, stream.sessionTips);
  score += getPromotionScoreBoost(stream);

  if (options.genreNightGenre && stream.genre === options.genreNightGenre) {
    score += DISCOVER_GENRE_NIGHT_BOOST;
  }
  if (stream.djUserId && options.flagshipDjIds?.has(stream.djUserId)) {
    score += DISCOVER_FLAGSHIP_BOOST;
  }

  return score;
}

export function rankForDiscover<T extends DiscoverLiveStream>(
  streams: T[],
  options: DiscoverRankOptions = {},
): T[] {
  const sorted = [...streams].sort((a, b) => {
    const diff = finalDiscoverScore(b, options) - finalDiscoverScore(a, options);
    if (diff !== 0) return diff;
    const aStart = a.startedAt?.getTime() ?? 0;
    const bStart = b.startedAt?.getTime() ?? 0;
    return bStart - aStart;
  });

  const heroIdx = sorted.findIndex((s) => isSponsoredHero(s));
  if (heroIdx > 0) {
    const [hero] = sorted.splice(heroIdx, 1);
    sorted.unshift(hero);
  }

  return sorted;
}

/** @deprecated Use rankForDiscover */
export function rankLiveStreams<T extends DiscoverLiveStream>(streams: T[]): T[] {
  return rankForDiscover(streams);
}

export function getTodayGenreNight() {
  const day = new Date().getUTCDay();
  return GENRE_NIGHTS[day] ?? null;
}

export function isStreamSponsored(stream: DiscoverLiveStream): boolean {
  return isSponsoredHero(stream);
}

export function getHeroLabel(stream: DiscoverLiveStream): "Sponsored" | "Trending" {
  return isSponsoredHero(stream) ? "Sponsored" : "Trending";
}

export function isGridPromoted(stream: DiscoverLiveStream): boolean {
  return (
    stream.promotionTier === "grid" &&
    Boolean(stream.promotedUntil && stream.promotedUntil.getTime() > Date.now())
  );
}
