import { prisma } from "./db";

export async function isUserBannedFromStream(streamId: string, userId: string) {
  const ban = await prisma.streamChatBan.findUnique({
    where: { streamId_userId: { streamId, userId } },
  });
  return Boolean(ban);
}

export async function canModerateStreamChat(
  streamId: string,
  userId: string,
  role: string,
): Promise<boolean> {
  if (role === "admin") return true;
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { djId: true },
  });
  return stream?.djId === userId;
}

export async function banUserFromStreamChat(
  streamId: string,
  userId: string,
  bannedBy: string,
  reason?: string,
) {
  return prisma.streamChatBan.upsert({
    where: { streamId_userId: { streamId, userId } },
    create: { streamId, userId, bannedBy, reason },
    update: { bannedBy, reason, createdAt: new Date() },
  });
}

export async function unbanUserFromStreamChat(streamId: string, userId: string) {
  await prisma.streamChatBan.deleteMany({
    where: { streamId, userId },
  });
}
