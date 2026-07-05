import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { getSessionUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;
  const session = await getSessionUser();

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, djId: true },
  });
  if (!stream) return error("Stream not found", 404);

  const [count, liked] = await Promise.all([
    prisma.streamLike.count({ where: { streamId } }),
    session
      ? prisma.streamLike.findUnique({
          where: { streamId_userId: { streamId, userId: session.id } },
        })
      : Promise.resolve(null),
  ]);

  return json({ count, liked: Boolean(liked) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const limited = enforceRateLimit(request, "stream-like", 30, 60 * 1000);
  if (limited) return limited;

  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { streamId } = await params;
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, djId: true },
  });
  if (!stream) return error("Stream not found", 404);
  if (stream.djId === auth.id) return error("Cannot like your own stream", 400);

  await prisma.streamLike.upsert({
    where: { streamId_userId: { streamId, userId: auth.id } },
    create: { streamId, userId: auth.id },
    update: {},
  });

  const count = await prisma.streamLike.count({ where: { streamId } });
  return json({ liked: true, count });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { streamId } = await params;
  await prisma.streamLike.deleteMany({
    where: { streamId, userId: auth.id },
  });

  const count = await prisma.streamLike.count({ where: { streamId } });
  return json({ liked: false, count });
}
