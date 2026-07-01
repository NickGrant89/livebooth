import { prisma } from "@/lib/db";
import { json, error } from "@/lib/api-utils";
import { getSessionUser } from "@/lib/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { bumpQuestProgress } from "@/lib/quests";

const PRESENCE_TTL_MS = 60_000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;
  const body = (await request.json()) as { viewerKey?: string };
  const viewerKey = body.viewerKey?.trim();
  if (!viewerKey) return error("Missing viewerKey", 400);

  const stream = await prisma.stream.findFirst({
    where: { id: streamId, status: "live" },
  });
  if (!stream) return error("Stream not live", 404);

  const session = await getSessionUser();
  const now = new Date();
  const cutoff = new Date(now.getTime() - PRESENCE_TTL_MS);

  await prisma.streamPresence.upsert({
    where: { streamId_viewerKey: { streamId, viewerKey } },
    create: { streamId, viewerKey, userId: session?.id ?? null, lastSeen: now },
    update: { lastSeen: now, userId: session?.id ?? undefined },
  });

  await prisma.streamPresence.deleteMany({
    where: { streamId, lastSeen: { lt: cutoff } },
  });

  const viewers = await prisma.streamPresence.count({ where: { streamId } });

  await prisma.stream.update({
    where: { id: streamId },
    data: { peakViewers: Math.max(stream.peakViewers, viewers) },
  });

  if (session) {
    await prisma.user.update({
      where: { id: session.id },
      data: { watchMinutes: { increment: 0.5 } },
    });
    await bumpQuestProgress(session.id, "watch_minutes", 0.5);
    await evaluateAchievements(session.id);
  }

  return json({ viewers, peakViewers: Math.max(stream.peakViewers, viewers) });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;
  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream) return error("Not found", 404);

  const cutoff = new Date(Date.now() - PRESENCE_TTL_MS);
  const viewers = await prisma.streamPresence.count({
    where: { streamId, lastSeen: { gte: cutoff } },
  });

  return json({ viewers, peakViewers: stream.peakViewers });
}
