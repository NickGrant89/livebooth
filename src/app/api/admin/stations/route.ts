import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { getTierMeta } from "@/lib/stations";
import { z } from "zod";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const q = new URL(request.url).searchParams.get("q")?.trim();
  const stations = await prisma.radioStation.findMany({
    where: q
      ? {
          OR: [
            { slug: { contains: q } },
            { name: { contains: q } },
            { owner: { username: { contains: q } } },
            { owner: { email: { contains: q } } },
          ],
        }
      : undefined,
    include: {
      owner: { select: { id: true, username: true, displayName: true, email: true } },
      _count: { select: { residents: true, follows: true, streams: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({
    stations: stations.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      tier: s.tier,
      tierLabel: getTierMeta(s.tier).label,
      relayUrl: s.relayUrl,
      owner: s.owner,
      residentCount: s._count.residents,
      followerCount: s._count.follows,
      showCount: s._count.streams,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

const patchSchema = z.object({
  stationId: z.string(),
  tier: z.enum(["community", "pro", "network"]).optional(),
  relayUrl: z.string().url().nullable().optional(),
});

export async function PATCH(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = patchSchema.parse(await request.json());
    const station = await prisma.radioStation.findUnique({ where: { id: body.stationId } });
    if (!station) return error("Station not found", 404);

    const data: Record<string, unknown> = {};
    if (body.tier) data.tier = body.tier;
    if (body.relayUrl !== undefined) data.relayUrl = body.relayUrl;

    const updated = await prisma.radioStation.update({
      where: { id: body.stationId },
      data,
    });

    await logAdminAction(admin.id, "station_update", body.stationId, data, request);
    return json({
      station: {
        id: updated.id,
        slug: updated.slug,
        tier: updated.tier,
        tierLabel: getTierMeta(updated.tier).label,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Update failed", 500);
  }
}
