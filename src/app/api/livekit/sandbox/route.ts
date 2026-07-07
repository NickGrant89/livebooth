import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  createSandboxParticipantToken,
  getLiveKitRoomService,
  isLiveKitConfigured,
  sandboxRoomName,
} from "@/lib/livekit";

export const dynamic = "force-dynamic";

/** JWT for a personal sandbox room — test camera + LiveKit without a collab invite. */
export async function POST(request: Request) {
  if (!isLiveKitConfigured()) {
    return error("LiveKit not enabled on this deployment", 503);
  }

  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { studioInstanceId } = ((await request.json().catch(() => ({}))) ?? {}) as {
    studioInstanceId?: string;
  };

  const room = sandboxRoomName(auth.id);
  try {
    const client = getLiveKitRoomService();
    await client.createRoom({
      name: room,
      emptyTimeout: 120,
      maxParticipants: 2,
    });
  } catch {
    /* room may already exist */
  }

  const token = await createSandboxParticipantToken({
    userId: auth.id,
    username: auth.username,
    displayName: auth.displayName ?? auth.username,
    studioInstanceId,
  });

  return json(token);
}
