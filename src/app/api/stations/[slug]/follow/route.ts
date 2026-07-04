import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  followStation,
  unfollowStation,
  isFollowingStation,
  getStationFollowCount,
} from "@/lib/station-staking";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const station = await prisma.radioStation.findUnique({ where: { slug } });
  if (!station) return error("Station not found", 404);

  const session = await getSessionUser();
  let following = false;
  if (session) {
    following = await isFollowingStation(session.id, station.id);
  }

  const followerCount = await getStationFollowCount(station.id);
  return json({ following, followerCount });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { slug } = await params;
  const station = await prisma.radioStation.findUnique({ where: { slug } });
  if (!station) return error("Station not found", 404);

  await followStation(auth.id, station.id);
  const followerCount = await getStationFollowCount(station.id);
  return json({ ok: true, following: true, followerCount });
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

  await unfollowStation(auth.id, station.id);
  const followerCount = await getStationFollowCount(station.id);
  return json({ ok: true, following: false, followerCount });
}
