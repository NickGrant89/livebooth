import "server-only";

import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.LIVEKIT_URL?.replace(/\/$/, "");
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? "";

export function isLiveKitConfigured(): boolean {
  return Boolean(
    process.env.COLLAB_WEBRTC_ENABLED === "true" &&
      LIVEKIT_URL &&
      LIVEKIT_API_KEY &&
      LIVEKIT_API_SECRET,
  );
}

export function collabRoomName(collabId: string): string {
  return `collab-${collabId}`;
}

export function getLiveKitRoomService() {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("LiveKit not configured");
  }
  const host = LIVEKIT_URL.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
  return new RoomServiceClient(host, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

export async function createCollabParticipantToken(options: {
  collabId: string;
  userId: string;
  username: string;
  displayName: string;
  role: "host" | "partner";
}) {
  if (!isLiveKitConfigured()) {
    throw new Error("LiveKit collab not enabled");
  }

  const room = collabRoomName(options.collabId);
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: options.userId,
    name: options.displayName || options.username,
    ttl: "6h",
  });

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return {
    room,
    token: await at.toJwt(),
    url: LIVEKIT_URL!,
    role: options.role,
  };
}

/** Ensure collab room exists before tokens are issued. */
export async function ensureCollabRoom(collabId: string) {
  const client = getLiveKitRoomService();
  const room = collabRoomName(collabId);
  try {
    await client.createRoom({
      name: room,
      emptyTimeout: 300,
      maxParticipants: 4,
    });
  } catch {
    /* room may already exist */
  }
  return room;
}
