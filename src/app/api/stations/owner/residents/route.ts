import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { getOwnedStation, getTierMeta } from "@/lib/stations";
import { z } from "zod";

const addSchema = z.object({
  djUsername: z.string().min(1),
  showTitle: z.string().optional(),
  slotDay: z.number().int().min(0).max(6).optional().nullable(),
  slotHour: z.number().int().min(0).max(23).optional().nullable(),
  slotLabel: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const station = await getOwnedStation(auth.id);
  if (!station) return error("No station owned by this account", 404);

  const tierMeta = getTierMeta(station.tier);
  if (station.residents.length >= tierMeta.maxResidents) {
    return error(`Resident limit (${tierMeta.maxResidents}) reached for ${tierMeta.label} tier`, 400);
  }

  try {
    const body = addSchema.parse(await request.json());
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
        slotDay: body.slotDay ?? null,
        slotHour: body.slotHour ?? null,
        slotLabel: body.slotLabel ?? null,
      },
      update: {
        showTitle: body.showTitle ?? "",
        slotDay: body.slotDay ?? null,
        slotHour: body.slotHour ?? null,
        slotLabel: body.slotLabel ?? null,
      },
      include: { dj: { select: { username: true, displayName: true, avatar: true } } },
    });

    return json({ resident });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid resident data");
    return error("Failed to add resident", 500);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const station = await getOwnedStation(auth.id);
  if (!station) return error("No station owned by this account", 404);

  const residentId = new URL(request.url).searchParams.get("id");
  if (!residentId) return error("Resident id required", 400);

  const resident = await prisma.stationResident.findFirst({
    where: { id: residentId, stationId: station.id },
  });
  if (!resident) return error("Resident not found", 404);

  if (station.flagshipDjId === resident.djId) {
    await prisma.radioStation.update({
      where: { id: station.id },
      data: { flagshipDjId: null },
    });
  }

  await prisma.stationResident.delete({ where: { id: residentId } });
  return json({ ok: true });
}
