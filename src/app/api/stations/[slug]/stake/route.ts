import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  joinStationMembership,
  cancelStationMembership,
  getStationStake,
  getStationStakeTotal,
  listTopStationStakers,
  getStationMilestoneProgress,
} from "@/lib/station-staking";
import { getStationMemberMrr, isMembershipActive } from "@/lib/membership";
import { STATION_MEMBER_COMMUNITY_GOAL } from "@/lib/constants";
import { z } from "zod";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const station = await prisma.radioStation.findUnique({
    where: { slug },
    include: { flagshipDj: { select: { username: true, displayName: true } } },
  });
  if (!station) return error("Station not found", 404);

  const session = await getSessionUser();
  let myMembership = null;
  if (session) {
    const stake = await getStationStake(session.id, station.id);
    if (stake && isMembershipActive(stake)) {
      myMembership = {
        tier: stake.tier,
        monthlyAmount: stake.monthlyAmount,
        nextBillingAt: stake.nextBillingAt?.toISOString() ?? null,
        lifetimePaid: stake.lifetimePaid,
      };
    }
  }

  const [totals, topStakers, milestones, mrr] = await Promise.all([
    getStationStakeTotal(station.id),
    listTopStationStakers(station.id),
    getStationMilestoneProgress(station.id),
    getStationMemberMrr(station.id),
  ]);

  return json({
    stationSlug: slug,
    totalMrr: totals.total,
    memberCount: totals.stakers,
    myMembership,
    myStake: myMembership ? { amount: myMembership.monthlyAmount } : null,
    flagshipDj: station.flagshipDj,
    topStakers: topStakers.map((s) => ({
      displayName: s.fan.displayName,
      username: s.fan.username,
      avatar: s.fan.avatar,
      amount: s.monthlyAmount,
      tier: s.tier,
    })),
    milestones,
    communityGoal: {
      ...STATION_MEMBER_COMMUNITY_GOAL,
      currentMrr: mrr.mrr,
      memberCount: mrr.count,
      progress: Math.min(
        100,
        Math.round((mrr.mrr / STATION_MEMBER_COMMUNITY_GOAL.targetMrr) * 100),
      ),
    },
  });
}

const joinSchema = z.object({
  tier: z.enum(["member", "supporter"]).optional(),
  amount: z.number().positive().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { slug } = await params;
  const station = await prisma.radioStation.findUnique({ where: { slug } });
  if (!station) return error("Station not found", 404);

  try {
    const body = joinSchema.parse(await request.json());
    const tier =
      body.tier ??
      (body.amount && body.amount >= 75 ? "supporter" : "member");
    const result = await joinStationMembership(auth.id, station.id, tier);
    if (!result.ok) return error(result.error, 402);
    return json({ ok: true, tier: result.tier, monthlyAmount: result.amount });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid membership");
    return error("Membership failed", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { slug } = await params;
  const station = await prisma.radioStation.findUnique({ where: { slug } });
  if (!station) return error("Station not found", 404);

  const result = await cancelStationMembership(auth.id, station.id);
  if (!result.ok) return error(result.error, 400);
  return json({ ok: true });
}
