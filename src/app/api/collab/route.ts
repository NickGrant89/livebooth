import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  createStreamSession,
  getIngestModeForStream,
  getRtmpIngestUrl,
  publishStreamSession,
  resolveLivePlaybackUrl,
} from "@/lib/streaming";
import {
  notifyCollabAccepted,
  notifyCollabDeclined,
  notifyCollabInvite,
} from "@/lib/notifications";
import { z } from "zod";

const inviteSchema = z.object({
  streamId: z.string(),
  partnerUsername: z.string(),
  splitRatio: z.number().min(0.1).max(0.9).default(0.5),
});

function serializePartnerStream(stream: {
  id: string;
  ingestKey: string | null;
  playbackUrl: string | null;
  title: string;
  status: string;
}) {
  return {
    id: stream.id,
    title: stream.title,
    status: stream.status,
    ingestKey: stream.ingestKey,
    rtmpUrl: getRtmpIngestUrl(stream.ingestKey),
    playbackUrl: resolveLivePlaybackUrl(stream.status, stream.ingestKey, stream.playbackUrl),
    ingestMode: getIngestModeForStream(stream.ingestKey, stream.playbackUrl),
  };
}

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const collabs = await prisma.streamCollab.findMany({
    where: {
      OR: [{ stream: { djId: auth.id } }, { partnerDjId: auth.id }],
      status: { in: ["pending", "active"] },
    },
    include: {
      stream: { include: { dj: { select: { username: true, displayName: true } } } },
      partnerStream: true,
    },
  });

  const withPartner = await Promise.all(
    collabs.map(async (c) => {
      const partner = await prisma.user.findUnique({
        where: { id: c.partnerDjId },
        select: { username: true, displayName: true },
      });
      const isPartner = c.partnerDjId === auth.id;
      return {
        id: c.id,
        streamId: c.streamId,
        streamTitle: c.stream.title,
        host: c.stream.dj.displayName,
        hostUsername: c.stream.dj.username,
        partner: partner?.displayName ?? "Unknown",
        partnerUsername: partner?.username ?? "",
        splitRatio: c.splitRatio,
        status: c.status,
        role: isPartner ? ("partner" as const) : ("host" as const),
        canRespond: isPartner && c.status === "pending",
        hostStreamStatus: c.stream.status,
        partnerStream: c.partnerStream ? serializePartnerStream(c.partnerStream) : null,
      };
    }),
  );

  return json({ collabs: withPartner });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (auth.role !== "dj" && auth.role !== "admin") {
    return error("DJ accounts only", 403);
  }

  try {
    const body = inviteSchema.parse(await request.json());
    const stream = await prisma.stream.findFirst({
      where: {
        id: body.streamId,
        djId: auth.id,
        status: { in: ["preparing", "live"] },
        stationChannel: false,
      },
      include: { dj: { select: { displayName: true, username: true } } },
    });
    if (!stream) return error("No active stream found — go live first", 404);

    const partner = await prisma.user.findUnique({
      where: { username: body.partnerUsername.replace(/^@/, "") },
    });
    if (!partner || (partner.role !== "dj" && partner.role !== "admin")) {
      return error("DJ not found", 404);
    }
    if (partner.id === auth.id) return error("Cannot collab with yourself", 400);

    const partnerBusy = await prisma.stream.findFirst({
      where: { djId: partner.id, status: { in: ["preparing", "live"] } },
    });
    if (partnerBusy) {
      return error("That DJ already has an active stream — ask them to end it first", 409);
    }

    const existing = await prisma.streamCollab.findUnique({
      where: { streamId: stream.id },
    });
    if (existing) return error("Collab invite already sent for this stream", 409);

    const collabRecord = await prisma.streamCollab.create({
      data: {
        streamId: stream.id,
        partnerDjId: partner.id,
        splitRatio: body.splitRatio,
        status: "pending",
      },
    });

    await notifyCollabInvite(
      partner.id,
      stream.dj.displayName,
      stream.dj.username,
      stream.title,
      body.splitRatio,
    );

    return json({ collab: { id: collabRecord.id, status: collabRecord.status } });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid invite");
    console.error("collab invite:", e);
    return error("Failed to invite", 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { collabId, accept } = (await request.json()) as {
    collabId: string;
    accept: boolean;
  };

  const collab = await prisma.streamCollab.findUnique({
    where: { id: collabId },
    include: {
      stream: { include: { dj: { select: { id: true, displayName: true, username: true } } } },
    },
  });
  if (!collab || collab.partnerDjId !== auth.id) return error("Not found", 404);
  if (collab.status !== "pending") return error("Invite already responded", 400);

  if (!accept) {
    const updated = await prisma.streamCollab.update({
      where: { id: collabId },
      data: { status: "declined" },
    });
    await notifyCollabDeclined(
      collab.stream.djId,
      auth.displayName ?? auth.username,
      collab.stream.title,
    );
    return json({ collab: updated });
  }

  const partnerBusy = await prisma.stream.findFirst({
    where: { djId: auth.id, status: { in: ["preparing", "live"] } },
  });
  if (partnerBusy) {
    return error("End your current stream before joining a collab", 409);
  }

  const partnerStream = await createStreamSession(
    auth.id,
    `${collab.stream.title} · B2B w/ ${collab.stream.dj.displayName}`,
    collab.stream.genre,
  );

  const updated = await prisma.streamCollab.update({
    where: { id: collabId },
    data: {
      status: "active",
      partnerStreamId: partnerStream.id,
    },
    include: { partnerStream: true },
  });

  await notifyCollabAccepted(
    collab.stream.djId,
    auth.displayName ?? auth.username,
    collab.stream.title,
    collab.stream.dj.username,
  );

  return json({
    collab: updated,
    partnerStream: serializePartnerStream(partnerStream),
  });
}

/** Partner publishes their collab feed (same as go-live publish). */
export async function PUT(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { streamId } = (await request.json()) as { streamId?: string };
  if (!streamId) return error("streamId required", 400);

  const collab = await prisma.streamCollab.findFirst({
    where: {
      partnerStreamId: streamId,
      partnerDjId: auth.id,
      status: "active",
    },
  });
  if (!collab) return error("Collab partner stream not found", 404);

  const stream = await publishStreamSession(streamId, auth.id);
  if (!stream) return error("Could not publish partner feed", 400);

  return json({ stream: serializePartnerStream(stream) });
}
