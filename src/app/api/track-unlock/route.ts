import { processTrackUnlock } from "@/lib/ledger";
import { evaluateAchievements } from "@/lib/achievements";
import { bumpQuestProgress } from "@/lib/quests";
import { getFanStreamPricing } from "@/lib/subscriptions";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { z } from "zod";

const schema = z.object({ streamId: z.string() });

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = schema.parse(await request.json());

    const stream = await prisma.stream.findUnique({
      where: { id: body.streamId },
      include: { nowPlaying: true, dj: true },
    });
    if (!stream?.nowPlaying) return error("No track playing", 404);

    const existing = await prisma.trackUnlock.findFirst({
      where: { streamId: stream.id, userId: auth.id },
    });
    if (existing) {
      return json({
        track: {
          title: stream.nowPlaying.title,
          artist: stream.nowPlaying.artist,
          bpm: stream.nowPlaying.bpm,
          key: stream.nowPlaying.musicalKey,
        },
        alreadyUnlocked: true,
      });
    }

    const pricing = await getFanStreamPricing(auth.id, stream.djId, stream.stationId);

    const unlock = await processTrackUnlock(
      auth.id,
      stream.id,
      stream.djId,
      stream.nowPlaying.title,
      stream.nowPlaying.artist,
      pricing.trackUnlockCost,
    );
    if (!unlock) return error(`Insufficient DROP (need ${pricing.trackUnlockCost})`, 402);

    await bumpQuestProgress(auth.id, "unlocks", 1);
    await evaluateAchievements(auth.id);

    return json({
      track: {
        title: stream.nowPlaying.title,
        artist: stream.nowPlaying.artist,
        bpm: stream.nowPlaying.bpm,
        key: stream.nowPlaying.musicalKey,
      },
      cost: pricing.trackUnlockCost,
      vip: pricing.vip,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid unlock request");
    return error("Unlock failed", 500);
  }
}

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const unlocks = await prisma.trackUnlock.findMany({
    where: { userId: auth.id },
    orderBy: { createdAt: "desc" },
    include: { stream: { include: { dj: true } } },
  });

  return json({
    tracks: unlocks.map((u) => ({
      id: u.id,
      title: u.trackTitle,
      artist: u.trackArtist,
      dj: u.stream.dj.displayName,
      streamTitle: u.stream.title,
      unlockedAt: u.createdAt.toISOString(),
    })),
  });
}
