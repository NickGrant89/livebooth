import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { getTierMeta } from "@/lib/stations";
import { normalizeStationSlug, validateStationSlug } from "@/lib/station-slug";
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

const createSchema = z.object({
  ownerUsername: z.string().min(1),
  slug: z.string().min(3).max(32),
  name: z.string().min(1).max(80),
  tagline: z.string().max(200).optional(),
  tier: z.enum(["community", "pro", "network"]).optional(),
  setOwnerRole: z.boolean().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = createSchema.parse(await request.json());
    const owner = await prisma.user.findUnique({
      where: { username: body.ownerUsername.trim().toLowerCase().replace(/^@/, "") },
    });
    if (!owner) return error("Owner user not found", 404);

    const existing = await prisma.radioStation.findUnique({ where: { ownerId: owner.id } });
    if (existing) return error("That user already owns a station", 400);

    const slug = normalizeStationSlug(body.slug);
    const slugError = validateStationSlug(slug);
    if (slugError) return error(slugError, 400);

    const slugTaken = await prisma.radioStation.findUnique({ where: { slug } });
    if (slugTaken) return error("Station slug already taken", 409);

    const station = await prisma.$transaction(async (tx) => {
      if (body.setOwnerRole !== false && owner.role !== "station" && owner.role !== "admin") {
        await tx.user.update({ where: { id: owner.id }, data: { role: "station" } });
      }
      return tx.radioStation.create({
        data: {
          slug,
          name: body.name.trim(),
          tagline: body.tagline?.trim() ?? "",
          avatar: owner.displayName.slice(0, 2).toUpperCase(),
          tier: body.tier ?? "community",
          ownerId: owner.id,
        },
      });
    });

    await logAdminAction(admin.id, "station_create", station.id, { slug, ownerId: owner.id }, request);
    return json({
      station: {
        id: station.id,
        slug: station.slug,
        name: station.name,
        tier: station.tier,
        tierLabel: getTierMeta(station.tier).label,
        owner: { id: owner.id, username: owner.username },
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid station data");
    console.error("admin station create:", e);
    return error("Create failed", 500);
  }
}

const deleteSchema = z.object({ stationId: z.string() });

export async function DELETE(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = deleteSchema.parse(await request.json());
    const station = await prisma.radioStation.findUnique({
      where: { id: body.stationId },
      select: { id: true, slug: true, name: true },
    });
    if (!station) return error("Station not found", 404);

    await prisma.radioStation.delete({ where: { id: body.stationId } });
    await logAdminAction(admin.id, "station_delete", body.stationId, { slug: station.slug }, request);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    console.error("admin station delete:", e);
    return error("Delete failed", 500);
  }
}
