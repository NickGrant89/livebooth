import { prisma } from "./db";

export type FanContribution = {
  points: number;
  questBonus: number;
  tipPoints: number;
  unlockBonus: number;
};

/** Fan contribution to an ended stream (for recap / grade share card). */
export async function computeFanContribution(
  streamId: string,
  userId: string,
): Promise<FanContribution | null> {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { status: true, startedAt: true },
  });
  if (!stream || stream.status !== "ended" || !stream.startedAt) return null;

  const presence = await prisma.streamPresence.findFirst({
    where: { streamId, userId },
  });
  if (!presence) return null;

  const [tips, unlocks, quests] = await Promise.all([
    prisma.tip.aggregate({
      where: { streamId, fromUserId: userId },
      _sum: { amount: true },
    }),
    prisma.trackUnlock.count({ where: { streamId, userId } }),
    prisma.fanQuestProgress.count({
      where: { userId, claimedStreamId: streamId, claimedAt: { not: null } },
    }),
  ]);

  const tipPoints = Math.min(100, Math.round(tips._sum.amount ?? 0));
  const unlockBonus = unlocks > 0 ? 25 : 0;
  const questBonus = quests > 0 ? 20 * quests : 0;
  const points = tipPoints + unlockBonus + questBonus;

  if (points <= 0) return null;

  return { points, questBonus, tipPoints, unlockBonus };
}
