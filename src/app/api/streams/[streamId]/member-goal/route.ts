import { prisma } from "@/lib/db";
import { json, error } from "@/lib/api-utils";
import { getDjMemberMrr, getStationMemberMrr } from "@/lib/membership";
import {
  DJ_MEMBER_COMMUNITY_GOAL,
  STATION_MEMBER_COMMUNITY_GOAL,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { djId: true, stationId: true, stationChannel: true },
  });
  if (!stream) return error("Stream not found", 404);

  if (stream.stationId) {
    const mrr = await getStationMemberMrr(stream.stationId);
    return json({
      kind: "station",
      ...STATION_MEMBER_COMMUNITY_GOAL,
      currentMrr: mrr.mrr,
      memberCount: mrr.count,
      progress: Math.min(
        100,
        Math.round((mrr.mrr / STATION_MEMBER_COMMUNITY_GOAL.targetMrr) * 100),
      ),
    });
  }

  const mrr = await getDjMemberMrr(stream.djId);
  return json({
    kind: "dj",
    ...DJ_MEMBER_COMMUNITY_GOAL,
    currentMrr: mrr.mrr,
    memberCount: mrr.count,
    progress: Math.min(100, Math.round((mrr.mrr / DJ_MEMBER_COMMUNITY_GOAL.targetMrr) * 100)),
  });
}
