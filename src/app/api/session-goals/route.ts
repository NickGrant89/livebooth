import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { getAchievementsForUser } from "@/lib/achievements";
import { ACHIEVEMENTS } from "@/lib/constants";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const streamId = new URL(request.url).searchParams.get("streamId");
  if (!streamId) return error("streamId required", 400);

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: { dj: true },
  });
  if (!stream) return error("Not found", 404);

  const isHost = stream.djId === auth.id;
  const audience = isHost ? "dj" : "fan";
  const achievements = await getAchievementsForUser(auth.id);
  const relevant = achievements.filter(
    (a) => !a.unlocked && a.audience === audience,
  );
  const next = relevant.sort((a, b) => b.progress - a.progress)[0];

  const prevStream = await prisma.stream.findFirst({
    where: { djId: stream.djId, status: "ended" },
    orderBy: { endedAt: "desc" },
  });

  const goals: Array<{ label: string; current: number; target: number; unit?: string }> = [];

  if (isHost) {
    goals.push({
      label: "Tips this set",
      current: stream.totalTips,
      target: Math.max(prevStream?.totalTips ?? 50, 50),
      unit: "DROP",
    });
    goals.push({
      label: "Peak viewers",
      current: stream.peakViewers,
      target: Math.max(prevStream?.peakViewers ?? 10, 10),
    });
  }

  if (next) {
    const def = ACHIEVEMENTS.find((a) => a.id === next.id);
    goals.push({
      label: next.name,
      current: Math.round(next.progress * (def?.threshold ?? 100)),
      target: def?.threshold ?? 100,
    });
  }

  return json({ goals, nextAchievement: next ?? null });
}
