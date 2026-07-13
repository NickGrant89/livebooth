import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { stakeOnDj, unstakeFromDj, getStake, getDjStakeTotal, listTopStakers, getDjMilestoneProgress } from "@/lib/staking";
import { z } from "zod";

export async function GET(request: Request) {
  const djUsername = new URL(request.url).searchParams.get("djUsername");
  if (!djUsername) return error("djUsername required", 400);

  const dj = await prisma.user.findUnique({ where: { username: djUsername } });
  if (!dj) return error("DJ not found", 404);

  const session = await getSessionUser();
  let myStake = null;
  if (session) {
    const stake = await getStake(session.id, dj.id);
    if (stake) myStake = { amount: stake.amount };
  }

  const [totals, topStakers, milestones] = await Promise.all([
    getDjStakeTotal(dj.id),
    listTopStakers(dj.id),
    getDjMilestoneProgress(dj.id),
  ]);

  return json({
    djUsername,
    totalStaked: totals.total,
    stakerCount: totals.stakers,
    myStake,
    topStakers: topStakers.map((s) => ({
      displayName: s.fan.displayName,
      username: s.fan.username,
      avatar: s.fan.avatar,
      amount: s.amount,
    })),
    milestones,
  });
}

const stakeSchema = z.object({
  djUsername: z.string(),
  amount: z.number().positive(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = stakeSchema.parse(await request.json());
    const dj = await prisma.user.findUnique({ where: { username: body.djUsername } });
    if (!dj) return error("DJ not found", 404);

    const result = await stakeOnDj(auth.id, dj.id, body.amount);
    if (!result.ok) return error(result.error, 402);
    return json({ ok: true, amount: result.amount });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid stake");
    return error("Stake failed", 500);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const djUsername = new URL(request.url).searchParams.get("djUsername");
  if (!djUsername) return error("djUsername required", 400);

  const dj = await prisma.user.findUnique({ where: { username: djUsername } });
  if (!dj) return error("DJ not found", 404);

  const result = await unstakeFromDj(auth.id, dj.id);
  if (!result.ok) return error(result.error, 400);
  return json({ ok: true, amount: result.amount });
}
