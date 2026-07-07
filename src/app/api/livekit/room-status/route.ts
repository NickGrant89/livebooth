import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import {
  collabRoomName,
  getLiveKitRoomService,
  isLiveKitConfigured,
} from "@/lib/livekit";
import { collabRoleFromIdentity } from "@/lib/livekit-room-stats";
import { TrackType } from "livekit-server-sdk";

export const dynamic = "force-dynamic";

/** Who is in the LiveKit collab room right now? (debug + UI) */
export async function GET(request: Request) {
  if (!isLiveKitConfigured()) {
    return json({ enabled: false });
  }

  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const collabId = new URL(request.url).searchParams.get("collabId");
  if (!collabId) return error("collabId required", 400);

  const collab = await prisma.streamCollab.findUnique({
    where: { id: collabId },
    select: { partnerDjId: true, stream: { select: { djId: true } } },
  });
  if (!collab) return error("Collab not found", 404);
  if (
    collab.stream.djId !== auth.id &&
    collab.partnerDjId !== auth.id &&
    auth.role !== "admin"
  ) {
    return error("Not allowed", 403);
  }

  const room = collabRoomName(collabId);
  try {
    const client = getLiveKitRoomService();
    const participants = await client.listParticipants(room);
    return json({
      enabled: true,
      room,
      participantCount: participants.length,
      participants: participants.map((p) => ({
        identity: p.identity,
        name: p.name,
        role: collabRoleFromIdentity(p.identity),
        tracks: p.tracks.length,
        hasVideo: p.tracks.some((t) => t.type === TrackType.VIDEO),
      })),
    });
  } catch (err) {
    console.error("livekit room-status:", err);
    return json({
      enabled: true,
      room,
      participantCount: 0,
      participants: [],
      serverError: "Could not list room — check LIVEKIT API keys match VPS",
    });
  }
}
