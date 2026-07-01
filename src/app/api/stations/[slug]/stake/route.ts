import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  stakeOnStation,
  unstakeFromStation,
  getStationStake,
  getStationStakeTotal,
  listTopStationStakers,
  getStationMilestoneProgress,
} from "@/lib/station-staking";
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
  let myStake = null;
  if (session) {
    const stake = await getStationStake(session.id, station.id);
    if (stake) myStake = { amount: stake.amount };
  }

  const [totals, topStakers, milestones] = await Promise.all([
    getStationStakeTotal(station.id),
    listTopStationStakers(station.id),
    getStationMilestoneProgress(station.id),
  ]);

  return json({
    stationSlug: slug,
    totalStaked: totals.total,
    stakerCount: totals.stakers,
    myStake,
    flagshipDj: station.flagshipDj,
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
  amount: z.number().positive(),
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
    const body = stakeSchema.parse(await request.json());
    const result = await stakeOnStation(auth.id, station.id, body.amount);
    if (!result.ok) return error(result.error, 402);
    return json({ ok: true, amount: result.amount });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid stake");
    return error("Stake failed", 500);
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

  const result = await unstakeFromStation(auth.id, station.id);
  if (!result.ok) return error(result.error, 400);
  return json({ ok: true, amount: result.amount });
}
