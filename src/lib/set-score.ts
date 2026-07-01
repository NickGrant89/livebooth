import { prisma } from "./db";

const GRADE_THRESHOLDS_NEW = [
  { grade: "S", min: 2000 },
  { grade: "A", min: 1500 },
  { grade: "B", min: 1000 },
  { grade: "C", min: 500 },
  { grade: "D", min: 0 },
];

export type SetScoreBreakdown = {
  tips: number;
  unlocks: number;
  uniqueTippers: number;
  peakViewers: number;
  chat: number;
  requests: number;
  duration: number;
  quests: number;
};

type StreamScoreInput = {
  totalTips: number;
  trackUnlockCount: number;
  uniqueTippers: number;
  peakViewers: number;
  chatMessageCount: number;
  acceptedRequestCount: number;
  durationMin: number;
  questClaimCount: number;
};

export function scoreFromComponents(input: StreamScoreInput): {
  score: number;
  breakdown: SetScoreBreakdown;
} {
  const breakdown: SetScoreBreakdown = {
    tips: Math.min(2000, Math.round(input.totalTips)),
    unlocks: Math.min(500, input.trackUnlockCount * 25),
    uniqueTippers: Math.min(500, input.uniqueTippers * 50),
    peakViewers: Math.min(400, input.peakViewers * 2),
    chat: Math.min(200, Math.floor(input.chatMessageCount / 5)),
    requests: Math.min(300, input.acceptedRequestCount * 30),
    duration: Math.min(200, Math.floor(input.durationMin / 15) * 10),
    quests: Math.min(200, input.questClaimCount * 20),
  };

  const score = Math.min(
    9999,
    Math.max(
      0,
      breakdown.tips +
        breakdown.unlocks +
        breakdown.uniqueTippers +
        breakdown.peakViewers +
        breakdown.chat +
        breakdown.requests +
        breakdown.duration +
        breakdown.quests,
    ),
  );

  return { score, breakdown };
}

export function gradeFromScore(score: number, par: number, streamCount: number): string {
  if (streamCount < 3) {
    for (const t of GRADE_THRESHOLDS_NEW) {
      if (score >= t.min) return t.grade;
    }
    return "D";
  }

  const ratio = par > 0 ? score / par : 1;
  if (ratio >= 1.4 && score >= 1500) return "S";
  if (ratio >= 1.15) return "A";
  if (ratio >= 0.85) return "B";
  if (ratio >= 0.6) return "C";
  return "D";
}

export function gradePaceLabel(score: number, par: number, streamCount: number): string {
  const grade = gradeFromScore(score, par, streamCount);
  return `${grade}-tier pace`;
}

async function djPar(djId: string, excludeStreamId?: string) {
  const past = await prisma.stream.findMany({
    where: {
      djId,
      status: "ended",
      setScore: { not: null },
      ...(excludeStreamId ? { id: { not: excludeStreamId } } : {}),
    },
    orderBy: { endedAt: "desc" },
    take: 20,
    select: { setScore: true },
  });
  const scores = past.map((s) => s.setScore!).filter((n) => n > 0);
  scores.sort((a, b) => a - b);
  const streamCount = scores.length;
  const par =
    scores.length > 0 ? scores[Math.floor(scores.length / 2)]! : 1000;
  return { par, streamCount };
}

export async function loadStreamScoreInput(streamId: string): Promise<StreamScoreInput | null> {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: {
      tips: true,
      trackUnlocks: true,
      crowdRequests: true,
      chatMessages: { where: { isTip: false } },
    },
  });
  if (!stream) return null;

  const questClaimCount = await prisma.fanQuestProgress.count({
    where: { claimedStreamId: streamId, claimedAt: { not: null } },
  });

  const durationMin =
    stream.startedAt
      ? ((stream.endedAt ?? new Date()).getTime() - stream.startedAt.getTime()) / 60000
      : 0;

  return {
    totalTips: stream.totalTips,
    trackUnlockCount: stream.trackUnlocks.length,
    uniqueTippers: new Set(stream.tips.map((t) => t.fromUserId)).size,
    peakViewers: stream.peakViewers,
    chatMessageCount: stream.chatMessages.length,
    acceptedRequestCount: stream.crowdRequests.filter((r) => r.status === "accepted").length,
    durationMin,
    questClaimCount,
  };
}

export async function computeLiveSetScore(streamId: string) {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { djId: true, status: true },
  });
  if (!stream || stream.status !== "live") return null;

  const input = await loadStreamScoreInput(streamId);
  if (!input) return null;

  const { score, breakdown } = scoreFromComponents(input);
  const { par, streamCount } = await djPar(stream.djId, streamId);

  return {
    score,
    breakdown,
    par,
    streamCount: streamCount + 1,
    gradePace: gradePaceLabel(score, par, streamCount + 1),
    questContributions: input.questClaimCount,
  };
}

export async function computeSetScore(streamId: string) {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { djId: true },
  });
  if (!stream?.djId) return null;

  const input = await loadStreamScoreInput(streamId);
  if (!input) return null;

  const { score, breakdown } = scoreFromComponents(input);
  const { par, streamCount } = await djPar(stream.djId, streamId);
  const grade = gradeFromScore(score, par, streamCount + 1);

  await prisma.stream.update({
    where: { id: streamId },
    data: { setScore: score, setGrade: grade },
  });

  return { setScore: score, setGrade: grade, par, breakdown };
}
