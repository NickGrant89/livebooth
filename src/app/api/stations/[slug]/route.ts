import { getSessionUser } from "@/lib/auth";
import { json, error } from "@/lib/api-utils";
import {
  getStationBySlug,
  getLiveStreamForStation,
  getStationStats,
  getTierMeta,
} from "@/lib/stations";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  tagline: z.string().max(200).optional(),
  avatar: z.string().max(4).optional(),
  relayUrl: z.string().url().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const station = await getStationBySlug(slug);
  if (!station) return error("Station not found", 404);

  const liveStream = await getLiveStreamForStation(station.id);
  const stats = getTierMeta(station.tier).stationDashboard
    ? await getStationStats(station.id)
    : null;

  return json({
    station: {
      id: station.id,
      slug: station.slug,
      name: station.name,
      tagline: station.tagline,
      avatar: station.avatar,
      tier: station.tier,
      tierMeta: getTierMeta(station.tier),
      relayUrl: station.relayUrl,
      owner: station.owner,
      residents: station.residents.map((r) => ({
        id: r.id,
        showTitle: r.showTitle,
        slotDay: r.slotDay,
        slotHour: r.slotHour,
        slotLabel: r.slotLabel,
        dj: r.dj,
      })),
    },
    liveStream: liveStream
      ? {
          id: liveStream.id,
          title: liveStream.title,
          username: liveStream.dj.username,
          djName: liveStream.dj.displayName,
          avatar: liveStream.dj.avatar,
          peakViewers: liveStream.peakViewers,
          nowPlaying: liveStream.nowPlaying,
        }
      : null,
    stats,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await getSessionUser();
  if (!session) return error("Unauthorized", 401);

  const station = await prisma.radioStation.findUnique({ where: { slug } });
  if (!station) return error("Station not found", 404);
  if (station.ownerId !== session.id && session.role !== "admin") {
    return error("Only the station owner can edit this channel", 403);
  }

  try {
    const body = patchSchema.parse(await request.json());
    const updated = await prisma.radioStation.update({
      where: { id: station.id },
      data: body,
    });
    return json({ station: updated });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid station data");
    console.error("station patch:", e);
    return error("Failed to update station", 500);
  }
}
