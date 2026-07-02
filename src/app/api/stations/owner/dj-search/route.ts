import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { getOwnedStation } from "@/lib/stations";

/** Search DJ accounts when adding station residents. */
export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const station = await getOwnedStation(auth.id);
  if (!station) return error("No station owned by this account", 404);

  const q = new URL(request.url).searchParams.get("q")?.trim().replace(/^@/, "") ?? "";
  if (q.length < 2) {
    return json({ djs: [] });
  }

  const existingDjIds = station.residents.map((r) => r.djId);

  const djs = await prisma.user.findMany({
    where: {
      role: { in: ["dj", "admin"] },
      suspendedAt: null,
      ...(existingDjIds.length > 0 ? { id: { notIn: existingDjIds } } : {}),
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      username: true,
      displayName: true,
      avatar: true,
    },
    orderBy: [{ username: "asc" }],
    take: 8,
  });

  return json({ djs });
}
