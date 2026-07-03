import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return error("Unauthorized", 401);
}

/** Use in API routes — returns user or a 401 response to return early. */
export async function requireApiUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return user;
}

export function isApiError(
  result: SessionUser | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

export function parseGenres(genres: string): string[] {
  try {
    return JSON.parse(genres) as string[];
  } catch {
    return [];
  }
}

export function serializeUser(user: {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  avatarUrl?: string;
  bannerUrl?: string;
  role: string;
  creatorType?: string;
  genres: string;
  walletAddress?: string | null;
  balance?: { balance: number; totalEarned: number } | null;
  _count?: { followers: number; following: number };
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatar: user.avatar,
    avatarUrl: user.avatarUrl ?? "",
    bannerUrl: user.bannerUrl ?? "",
    role: user.role,
    creatorType: user.creatorType ?? "dj",
    genres: parseGenres(user.genres),
    walletAddress: user.walletAddress,
    balance: user.balance?.balance ?? 0,
    totalEarned: user.balance?.totalEarned ?? 0,
    followers: user._count?.followers ?? 0,
    following: user._count?.following ?? 0,
  };
}

import { resolveLivePlaybackUrl } from "./streaming";

export function serializeStream(stream: {
  id: string;
  title: string;
  genre: string;
  bpmRange?: string | null;
  status: string;
  ingestKey?: string | null;
  playbackUrl?: string | null;
  vodUrl?: string | null;
  peakViewers: number;
  totalTips: number;
  startedAt?: Date | null;
  endedAt?: Date | null;
  dj: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    genres: string;
  };
  nowPlaying?: {
    title: string;
    artist: string;
    bpm?: number | null;
    musicalKey?: string | null;
  } | null;
}) {
  return {
    id: stream.id,
    title: stream.title,
    genre: stream.genre,
    bpmRange: stream.bpmRange,
    status: stream.status,
    playbackUrl: resolveLivePlaybackUrl(stream.status, stream.ingestKey, stream.playbackUrl),
    vodUrl: stream.vodUrl,
    peakViewers: stream.peakViewers,
    totalTips: stream.totalTips,
    startedAt: stream.startedAt?.toISOString(),
    endedAt: stream.endedAt?.toISOString(),
    isLive: stream.status === "live",
    dj: {
      id: stream.dj.id,
      username: stream.dj.username,
      displayName: stream.dj.displayName,
      avatar: stream.dj.avatar,
      genres: parseGenres(stream.dj.genres),
    },
    nowPlaying: stream.nowPlaying,
  };
}

export type ApiUser = SessionUser;
