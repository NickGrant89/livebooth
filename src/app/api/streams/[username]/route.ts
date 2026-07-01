import { prisma } from "@/lib/db";
import { json, error, serializeStream, requireApiUser, isApiError } from "@/lib/api-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const dj = await prisma.user.findUnique({ where: { username } });
  if (!dj) return error("Not found", 404);

  const stream = await prisma.stream.findFirst({
    where: { djId: dj.id, status: "live" },
    include: { dj: true, nowPlaying: true },
  });

  if (!stream) return error("Not live", 404);
  return json(serializeStream(stream));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { username } = await params;
  if (auth.username !== username && auth.role !== "admin") {
    return error("Forbidden", 403);
  }

  const body = await request.json();
  const { action } = body as { action: string };

  if (action === "heartbeat") {
    const stream = await prisma.stream.findFirst({
      where: { djId: auth.id, status: "live" },
    });
    if (stream && body.viewers) {
      await prisma.stream.update({
        where: { id: stream.id },
        data: {
          peakViewers: Math.max(stream.peakViewers, body.viewers as number),
        },
      });
    }
    return json({ ok: true });
  }

  return error("Unknown action");
}
