import { prisma } from "./db";
import { STREAM_DESCRIPTION_MAX, STREAM_TITLE_MAX } from "./constants";

export function normalizeStreamDescription(value: string | null | undefined): string {
  return (value ?? "").trim().slice(0, STREAM_DESCRIPTION_MAX);
}

export function normalizeStreamTitle(value: string): string {
  return value.trim().slice(0, STREAM_TITLE_MAX);
}

export async function canEditStreamDetails(
  userId: string,
  role: string,
  stream: { djId: string; stationId: string | null; stationChannel: boolean },
): Promise<boolean> {
  if (role === "admin") return true;
  if (stream.djId === userId) return true;
  if (stream.stationChannel && stream.stationId) {
    const station = await prisma.radioStation.findFirst({
      where: { id: stream.stationId, ownerId: userId },
      select: { id: true },
    });
    return Boolean(station);
  }
  return false;
}

export async function updateStreamDetails(
  streamId: string,
  userId: string,
  role: string,
  input: { title?: string; description?: string },
) {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: {
      id: true,
      djId: true,
      stationId: true,
      stationChannel: true,
      status: true,
      title: true,
      description: true,
    },
  });
  if (!stream) return { ok: false as const, error: "Stream not found" };
  if (!["preparing", "live", "ended"].includes(stream.status)) {
    return { ok: false as const, error: "This stream cannot be edited" };
  }

  const allowed = await canEditStreamDetails(userId, role, stream);
  if (!allowed) return { ok: false as const, error: "Not allowed to edit this stream" };

  const data: { title?: string; description?: string } = {};
  if (input.title !== undefined) {
    const title = normalizeStreamTitle(input.title);
    if (!title) return { ok: false as const, error: "Title is required" };
    data.title = title;
  }
  if (input.description !== undefined) {
    data.description = normalizeStreamDescription(input.description);
  }
  if (Object.keys(data).length === 0) {
    return { ok: false as const, error: "Nothing to update" };
  }

  const updated = await prisma.stream.update({
    where: { id: streamId },
    data,
    select: { id: true, title: true, description: true },
  });

  return { ok: true as const, stream: updated };
}
