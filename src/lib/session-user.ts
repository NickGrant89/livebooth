import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateBalance } from "@/lib/ledger";
import { getRtmpIngestUrl, getIngestModeForStream } from "@/lib/streaming";
import { parseGenres } from "@/lib/api-utils";
import type { AuthUser } from "@/context/AuthContext";

/** Full auth user payload — shared by /api/auth/me and server layout bootstrap. */
export async function getAuthUserForClient(): Promise<AuthUser | null> {
  const session = await getSessionUser();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      balance: true,
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!user) return null;
  await getOrCreateBalance(user.id);

  const liveStream = await prisma.stream.findFirst({
    where: { djId: user.id, status: "live" },
  });

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    balance: user.balance?.balance ?? 500,
    totalEarned: user.balance?.totalEarned ?? 0,
    walletAddress: user.walletAddress,
    liveStream: liveStream
      ? {
          id: liveStream.id,
          title: liveStream.title,
          ingestKey: liveStream.ingestKey,
          rtmpUrl: liveStream.ingestKey ? getRtmpIngestUrl(liveStream.ingestKey) : null,
          ingestMode: getIngestModeForStream(liveStream.ingestKey, liveStream.playbackUrl),
        }
      : null,
  };
}
