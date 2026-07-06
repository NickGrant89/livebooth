import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { getCollabWebRtcStatus, tryStartCollabWebRtcEgress } from "@/lib/livekit-egress";
import { isLiveKitConfigured } from "@/lib/livekit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isLiveKitConfigured()) {
    return json({ enabled: false });
  }

  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const collabId = new URL(request.url).searchParams.get("collabId");
  if (!collabId) return error("collabId required", 400);

  const status = await getCollabWebRtcStatus(collabId);
  if (!status) return error("Collab not found", 404);

  return json({ enabled: true, ...status });
}

export async function POST(request: Request) {
  if (!isLiveKitConfigured()) {
    return error("WebRTC collab not enabled", 503);
  }

  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { collabId } = (await request.json()) as { collabId?: string };
  if (!collabId) return error("collabId required", 400);

  const collab = await prisma.streamCollab.findUnique({
    where: { id: collabId },
    include: { stream: { select: { djId: true } } },
  });
  if (!collab) return error("Collab not found", 404);
  if (collab.partnerDjId !== auth.id && collab.stream.djId !== auth.id && auth.role !== "admin") {
    return error("Not allowed", 403);
  }

  const result = await tryStartCollabWebRtcEgress(collabId);
  return json({ egress: result });
}
