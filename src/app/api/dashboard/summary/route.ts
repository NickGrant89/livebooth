import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { contractsConfigured } from "@/lib/web3/contracts";
import { hasStreamReplay } from "@/lib/streaming";

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (auth.role !== "dj" && auth.role !== "admin") {
    return error("DJs only", 403);
  }

  const [user, recentSets, liveStream, achievementCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        streamStreak: true,
        weeklySlotDay: true,
        weeklySlotHour: true,
        weeklySlotLabel: true,
        walletAddress: true,
        balance: { select: { balance: true, totalEarned: true } },
        _count: { select: { followers: true } },
      },
    }),
    prisma.stream.findMany({
      where: { djId: auth.id, status: "ended" },
      orderBy: { endedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        genre: true,
        peakViewers: true,
        totalTips: true,
        setGrade: true,
        setScore: true,
        endedAt: true,
        vodUrl: true,
        playbackUrl: true,
      },
    }),
    prisma.stream.findFirst({
      where: { djId: auth.id, status: "live" },
      select: { id: true, title: true, peakViewers: true, totalTips: true, setGrade: true, setScore: true },
    }),
    prisma.userAchievement.count({
      where: { userId: auth.id, unlockedAt: { not: null } },
    }),
  ]);

  if (!user) return error("Not found", 404);

  const walletLinked = Boolean(user.walletAddress?.startsWith("0x"));

  return json({
    followers: user._count.followers,
    balance: user.balance?.balance ?? 0,
    totalEarned: user.balance?.totalEarned ?? 0,
    streamStreak: user.streamStreak,
    weeklySlotDay: user.weeklySlotDay,
    weeklySlotHour: user.weeklySlotHour,
    weeklySlotLabel: user.weeklySlotLabel,
    achievementCount,
    walletLinked,
    canReceiveOnChainTips: walletLinked,
    contractsConfigured: contractsConfigured(),
    liveStream,
    recentSets: recentSets.map((s) => ({
      ...s,
      endedAt: s.endedAt?.toISOString() ?? null,
      hasReplay: hasStreamReplay(s.vodUrl, s.playbackUrl),
    })),
    lastSet: recentSets[0]
      ? {
          id: recentSets[0].id,
          title: recentSets[0].title,
          setGrade: recentSets[0].setGrade,
          setScore: recentSets[0].setScore,
          peakViewers: recentSets[0].peakViewers,
          totalTips: recentSets[0].totalTips,
        }
      : null,
  });
}
