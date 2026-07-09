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
  /** Unique per browser tab — avoids LiveKit kicking duplicate identities on reconnect. */
  studioInstanceId?: string;
}) {
  if (!isLiveKitConfigured()) {
    throw new Error("LiveKit collab not enabled");
  }

  const room = collabRoomName(options.collabId);
  const instance = (options.studioInstanceId ?? "main").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12);
  const identity = `${options.userId}-${options.role}-${instance}`;
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
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
    identity,
  };
}

export function sandboxRoomName(userId: string): string {
  return `sandbox-${userId.slice(0, 12)}`;
}

/** Camera-only test room — no collab invite required. */
export async function createSandboxParticipantToken(options: {
  userId: string;
  username: string;
  displayName: string;
  studioInstanceId?: string;
}) {
  if (!isLiveKitConfigured()) {
    throw new Error("LiveKit collab not enabled");
  }

  const room = sandboxRoomName(options.userId);
  const instance = (options.studioInstanceId ?? "test").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12);
  const identity = `${options.userId}-sandbox-${instance}`;
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: options.displayName || options.username,
    ttl: "1h",
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
    identity,
  };
}

/** Remove ghost sessions from prior joins (same DJ, old tab/instance). */
export async function evictStaleStudioSessions(options: {
  collabId: string;
  userId: string;
  role: "host" | "partner";
  keepIdentity: string;
}) {
  const client = getLiveKitRoomService();
  const room = collabRoomName(options.collabId);
  const prefix = `${options.userId}-${options.role}-`;
  try {
    const participants = await client.listParticipants(room);
    for (const p of participants) {
      if (p.identity.startsWith(prefix) && p.identity !== options.keepIdentity) {
        await client.removeParticipant(room, p.identity);
      }
    }
  } catch {
    /* room may be empty */
  }
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
