import "server-only";

import {
  EgressClient,
  StreamOutput,
  StreamProtocol,
  TrackType,
  EncodingOptionsPreset,
} from "livekit-server-sdk";
import { prisma } from "./db";
import {
  collabRoomName,
  getLiveKitRoomService,
  isLiveKitConfigured,
} from "./livekit";
import { hlsManifestReady } from "./hls-playback";

function compositedIngestKey(hostIngestKey: string): string {
  return `${hostIngestKey}_mix`;
}

const LIVEKIT_URL = process.env.LIVEKIT_URL?.replace(/\/$/, "");
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? "";
/** RTMP base reachable from egress container (Docker service name on VPS). */
const EGRESS_RTMP_BASE = (
  process.env.LIVEKIT_EGRESS_RTMP_URL ?? "rtmp://mediamtx:1935/live"
).replace(/\/$/, "");

function getEgressClient() {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("LiveKit not configured");
  }
  const host = LIVEKIT_URL.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
  return new EgressClient(host, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

export type CollabWebRtcStatus = {
  room: string;
  participantCount: number;
  videoPublishers: number;
  compositorActive: boolean;
  canStartEgress: boolean;
  egressHealthy: boolean;
};

export async function getCollabWebRtcStatus(collabId: string): Promise<CollabWebRtcStatus | null> {
  if (!isLiveKitConfigured()) return null;

  const collab = await prisma.streamCollab.findUnique({
    where: { id: collabId },
    select: { compositorActive: true, stream: { select: { ingestKey: true } } },
  });
  if (!collab) return null;

  const room = collabRoomName(collabId);
  const client = getLiveKitRoomService();
  let participants: Awaited<ReturnType<typeof client.listParticipants>> = [];
  try {
    participants = await client.listParticipants(room);
  } catch {
    participants = [];
  }

  const videoPublishers = participants.filter((p) =>
    p.tracks.some((t) => t.type === TrackType.VIDEO),
  ).length;

  let egressHealthy = true;
  try {
    const egress = getEgressClient();
    const active = await egress.listEgress({ roomName: room, active: true });
    egressHealthy = active.length >= 0;
  } catch {
    egressHealthy = false;
  }

  return {
    room,
    participantCount: participants.length,
    videoPublishers,
    compositorActive: collab.compositorActive,
    canStartEgress: videoPublishers >= 2 && !collab.compositorActive,
    egressHealthy,
  };
}

export async function tryStartCollabWebRtcEgress(collabId: string) {
  if (!isLiveKitConfigured()) {
    return { active: false, reason: "webrtc_not_configured" as const };
  }

  const collab = await prisma.streamCollab.findUnique({
    where: { id: collabId },
    include: {
      stream: { select: { id: true, status: true, ingestKey: true } },
    },
  });

  if (!collab || collab.status !== "active") {
    return { active: false, reason: "collab_not_active" as const };
  }
  if (!collab.stream.ingestKey) {
    return { active: false, reason: "missing_host_key" as const };
  }
  if (collab.compositorActive && collab.compositedIngestKey) {
    return { active: true, outputKey: collab.compositedIngestKey, reason: "already_active" as const };
  }

  const status = await getCollabWebRtcStatus(collabId);
  if (!status || status.videoPublishers < 2) {
    return { active: false, reason: "need_two_publishers" as const };
  }

  const room = collabRoomName(collabId);
  const outputKey = compositedIngestKey(collab.stream.ingestKey);
  const rtmpUrl = `${EGRESS_RTMP_BASE}/${outputKey}`;

  try {
    const egress = getEgressClient();
    const existing = await egress.listEgress({ roomName: room, active: true });
    for (const item of existing) {
      if (item.egressId) await egress.stopEgress(item.egressId);
    }

    const streamOutput = new StreamOutput({
      protocol: StreamProtocol.RTMP,
      urls: [rtmpUrl],
    });

    await egress.startRoomCompositeEgress(room, streamOutput, {
      layout: "speaker",
      encodingOptions: EncodingOptionsPreset.H264_720P_30,
    });
  } catch (err) {
    console.error("livekit egress start:", err);
    return { active: false, reason: "egress_start_failed" as const };
  }

  await prisma.streamCollab.update({
    where: { id: collabId },
    data: {
      compositorActive: true,
      compositedIngestKey: outputKey,
      compositorStartedAt: new Date(),
    },
  });

  const hlsBase = process.env.HLS_SERVER_URL?.replace(/\/$/, "");
  if (hlsBase) {
    const manifestUrl = `${hlsBase}/live/${encodeURIComponent(outputKey)}/index.m3u8`;
    for (let i = 0; i < 24; i++) {
      if (await hlsManifestReady(manifestUrl)) {
        return { active: true, outputKey, reason: "activated" as const };
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    // Egress RTMP is running — HLS manifest can lag; do not tear down egress.
    return { active: true, outputKey, reason: "activated_pending_hls" as const };
  }

  return { active: true, outputKey, reason: "activated" as const };
}

export async function stopCollabWebRtcEgress(collabId: string) {
  if (!isLiveKitConfigured()) return;
  const room = collabRoomName(collabId);
  try {
    const egress = getEgressClient();
    const active = await egress.listEgress({ roomName: room, active: true });
    for (const item of active) {
      if (item.egressId) await egress.stopEgress(item.egressId);
    }
  } catch (err) {
    console.error("livekit egress stop:", err);
  }
}
