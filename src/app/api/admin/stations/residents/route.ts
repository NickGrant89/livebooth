import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { getTierMeta } from "@/lib/stations";
import { z } from "zod";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const stationId = new URL(request.url).searchParams.get("stationId");
  if (!stationId) return error("stationId required", 400);

  const residents = await prisma.stationResident.findMany({
    where: { stationId },
    include: { dj: { select: { id: true, username: true, displayName: true, avatar: true } } },
    orderBy: { id: "asc" },
  });

  return json({ residents });
}

const addSchema = z.object({
  stationId: z.string(),
  djUsername: z.string().min(1),
  showTitle: z.string().optional(),
});

const removeSchema = z.object({
  stationId: z.string(),
  residentId: z.string(),
});

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = addSchema.parse(await request.json());
    const station = await prisma.radioStation.findUnique({
      where: { id: body.stationId },
      include: { _count: { select: { residents: true } } },
    });
    if (!station) return error("Station not found", 404);

    const tierMeta = getTierMeta(station.tier);
    if (station._count.residents >= tierMeta.maxResidents) {
      return error(`Resident limit (${tierMeta.maxResidents}) reached`, 400);
    }

    const dj = await prisma.user.findUnique({
      where: { username: body.djUsername.replace(/^@/, "") },
    });
    if (!dj || (dj.role !== "dj" && dj.role !== "admin")) {
      return error("DJ not found", 404);
    }

    const resident = await prisma.stationResident.upsert({
      where: { stationId_djId: { stationId: station.id, djId: dj.id } },
      create: {
        stationId: station.id,
        djId: dj.id,
        showTitle: body.showTitle ?? "",
      },
      update: { showTitle: body.showTitle ?? "" },
      include: { dj: { select: { username: true, displayName: true } } },
    });

    await logAdminAction(admin.id, "station_resident_add", station.id, { dj: dj.username }, request);
    return json({ resident });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid data");
    return error("Add failed", 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = removeSchema.parse(await request.json());
    const resident = await prisma.stationResident.findFirst({
      where: { id: body.residentId, stationId: body.stationId },
    });
    if (!resident) return error("Resident not found", 404);

    const station = await prisma.radioStation.findUnique({ where: { id: body.stationId } });
    if (station?.flagshipDjId === resident.djId) {
      await prisma.radioStation.update({
        where: { id: body.stationId },
        data: { flagshipDjId: null },
      });
    }

    await prisma.stationResident.delete({ where: { id: body.residentId } });
    await logAdminAction(admin.id, "station_resident_remove", body.stationId, { residentId: body.residentId }, request);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Remove failed", 500);
  }
}
