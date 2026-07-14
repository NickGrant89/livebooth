import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  joinDjMembership,
  cancelDjMembership,
  getStake,
  getDjStakeTotal,
  listTopStakers,
  getDjMilestoneProgress,
} from "@/lib/staking";
import { getDjMemberMrr, isMembershipActive } from "@/lib/membership";
import { DJ_MEMBER_COMMUNITY_GOAL } from "@/lib/constants";
import { z } from "zod";

export async function GET(request: Request) {
  const djUsername = new URL(request.url).searchParams.get("djUsername");
  if (!djUsername) return error("djUsername required", 400);

  const dj = await prisma.user.findUnique({ where: { username: djUsername } });
  if (!dj) return error("DJ not found", 404);

  const session = await getSessionUser();
  let myMembership = null;
  if (session) {
    const stake = await getStake(session.id, dj.id);
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
    getDjStakeTotal(dj.id),
    listTopStakers(dj.id),
    getDjMilestoneProgress(dj.id),
    getDjMemberMrr(dj.id),
  ]);

  return json({
    djUsername,
    totalMrr: totals.total,
    memberCount: totals.stakers,
    myMembership,
    myStake: myMembership ? { amount: myMembership.monthlyAmount } : null,
    topStakers: topStakers.map((s) => ({
      displayName: s.fan.displayName,
      username: s.fan.username,
      avatar: s.fan.avatar,
      amount: s.monthlyAmount,
      tier: s.tier,
    })),
    milestones,
    communityGoal: {
      ...DJ_MEMBER_COMMUNITY_GOAL,
      currentMrr: mrr.mrr,
      memberCount: mrr.count,
      progress: Math.min(100, Math.round((mrr.mrr / DJ_MEMBER_COMMUNITY_GOAL.targetMrr) * 100)),
    },
  });
}

const joinSchema = z.object({
  djUsername: z.string(),
  tier: z.enum(["member", "supporter"]).optional(),
  amount: z.number().positive().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = joinSchema.parse(await request.json());
    const dj = await prisma.user.findUnique({ where: { username: body.djUsername } });
    if (!dj) return error("DJ not found", 404);

    const tier =
      body.tier ??
      (body.amount && body.amount >= 75 ? "supporter" : "member");

    const result = await joinDjMembership(auth.id, dj.id, tier);
    if (!result.ok) return error(result.error, 402);
    return json({ ok: true, tier: result.tier, monthlyAmount: result.amount });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid membership");
    return error("Membership failed", 500);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const djUsername = new URL(request.url).searchParams.get("djUsername");
  if (!djUsername) return error("djUsername required", 400);

  const dj = await prisma.user.findUnique({ where: { username: djUsername } });
  if (!dj) return error("DJ not found", 404);

  const result = await cancelDjMembership(auth.id, dj.id);
  if (!result.ok) return error(result.error, 400);
  return json({ ok: true });
}
