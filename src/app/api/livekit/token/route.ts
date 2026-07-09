import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  createCollabParticipantToken,
  ensureCollabRoom,
  evictStaleStudioSessions,
  isLiveKitConfigured,
} from "@/lib/livekit";

export const dynamic = "force-dynamic";

/** JWT + room info for joining a collab LiveKit studio (WebRTC path). */
export async function POST(request: Request) {
  if (!isLiveKitConfigured()) {
    return error("LiveKit collab not enabled on this deployment", 503);
  }

  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { collabId, studioInstanceId } = (await request.json()) as {
    collabId?: string;
    studioInstanceId?: string;
  };
  if (!collabId) return error("collabId required", 400);

  const collab = await prisma.streamCollab.findUnique({
    where: { id: collabId },
    include: { stream: { select: { djId: true } } },
  });
  if (!collab || collab.status !== "active") return error("Collab not found", 404);

  const isHost = collab.stream.djId === auth.id;
  const isPartner = collab.partnerDjId === auth.id;
  if (!isHost && !isPartner && auth.role !== "admin") {
    return error("Not a participant in this collab", 403);
  }

  try {
    await ensureCollabRoom(collabId);
  } catch (err) {
    console.error("ensureCollabRoom:", err);
    return error(
      "LiveKit server unreachable — check LIVEKIT_URL and API keys on Vercel match the VPS",
      503,
    );
  }

  const token = await createCollabParticipantToken({
    collabId,
    userId: auth.id,
    username: auth.username,
    displayName: auth.displayName ?? auth.username,
    role: isHost ? "host" : "partner",
    studioInstanceId,
  });

  try {
    await evictStaleStudioSessions({
      collabId,
      userId: auth.id,
      role: isHost ? "host" : "partner",
      keepIdentity: token.identity,
    });
  } catch (err) {
    console.warn("evictStaleStudioSessions:", err);
  }

  return json(token);
}
