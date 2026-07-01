import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  banUserFromStreamChat,
  canModerateStreamChat,
  unbanUserFromStreamChat,
} from "@/lib/chat-moderation";
import { prisma } from "@/lib/db";
import { z } from "zod";

const banSchema = z.object({
  userId: z.string(),
  reason: z.string().max(200).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { streamId } = await params;
  const allowed = await canModerateStreamChat(streamId, auth.id, auth.role);
  if (!allowed) return error("Forbidden", 403);

  const bans = await prisma.streamChatBan.findMany({
    where: { streamId },
    include: {
      user: { select: { username: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({
    bans: bans.map((b) => ({
      userId: b.userId,
      username: b.user.username,
      displayName: b.user.displayName,
      reason: b.reason,
      createdAt: b.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { streamId } = await params;
  const allowed = await canModerateStreamChat(streamId, auth.id, auth.role);
  if (!allowed) return error("Forbidden", 403);

  try {
    const body = banSchema.parse(await request.json());
    const stream = await prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) return error("Stream not found", 404);
    if (body.userId === stream.djId) return error("Cannot ban the host", 400);

    await banUserFromStreamChat(streamId, body.userId, auth.id, body.reason);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Ban failed", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { streamId } = await params;
  const allowed = await canModerateStreamChat(streamId, auth.id, auth.role);
  if (!allowed) return error("Forbidden", 403);

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return error("userId required");

  await unbanUserFromStreamChat(streamId, userId);
  return json({ ok: true });
}
