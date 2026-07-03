import "server-only";

import type { ChatMessagePayload } from "@/lib/chat-hub";
import { publishChatMessage, serializeChatMessage } from "@/lib/chat-hub";
import { prisma } from "@/lib/db";

export async function attachChatProfiles(
  messages: ChatMessagePayload[],
): Promise<ChatMessagePayload[]> {
  const userIds = [...new Set(messages.map((m) => m.userId).filter(Boolean))] as string[];
  if (userIds.length === 0) return messages;

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, avatar: true, avatarUrl: true, displayName: true },
  });
  const profileMap = new Map(users.map((u) => [u.id, u]));

  return messages.map((msg) => {
    if (!msg.userId) return msg;
    const profile = profileMap.get(msg.userId);
    if (!profile) return msg;
    return {
      ...msg,
      avatar: profile.avatar,
      avatarUrl: profile.avatarUrl,
      displayName: profile.displayName,
    };
  });
}

export async function broadcastChatMessageWithProfile(
  streamId: string,
  msg: {
    id: string;
    userId?: string | null;
    username: string;
    message: string;
    isTip: boolean;
    tipAmount: number | null;
    createdAt: Date;
  },
  stakerBadge?: string | null,
) {
  const base = serializeChatMessage(msg, stakerBadge);
  const [enriched] = await attachChatProfiles([base]);
  publishChatMessage(streamId, enriched);
}
