import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  createCollabParticipantToken,
  ensureCollabRoom,
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

  const { collabId } = (await request.json()) as { collabId?: string };
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

  await ensureCollabRoom(collabId);
  const token = await createCollabParticipantToken({
    collabId,
    userId: auth.id,
    username: auth.username,
    displayName: auth.displayName ?? auth.username,
    role: isHost ? "host" : "partner",
  });

  return json(token);
}
