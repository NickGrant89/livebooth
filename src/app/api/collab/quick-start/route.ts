import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { createStreamSession } from "@/lib/streaming";
import { notifyCollabInvite } from "@/lib/notifications";
import { stopCollabWebRtcEgress } from "@/lib/livekit-egress";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  partnerUsername: z.string().min(1),
  splitRatio: z.number().min(0.1).max(0.9).default(0.5),
});

/** One-click host setup: create preview stream (if needed) + send collab invite. */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (auth.role !== "dj" && auth.role !== "admin") {
    return error("DJ accounts only", 403);
  }

  try {
    const body = schema.parse(await request.json());
    const partnerUsername = body.partnerUsername.replace(/^@/, "").trim().toLowerCase();

    const partner = await prisma.user.findUnique({
      where: { username: partnerUsername },
    });
    if (!partner || (partner.role !== "dj" && partner.role !== "admin")) {
      return error(`DJ @${partnerUsername} not found`, 404);
    }
    if (partner.id === auth.id) {
      return error("Use two different accounts to test collab (host + partner)", 400);
    }

    let stream = await prisma.stream.findFirst({
      where: { djId: auth.id, status: { in: ["preparing", "live"] } },
      include: { dj: { select: { displayName: true, username: true } } },
    });

    if (!stream) {
      const created = await createStreamSession(auth.id, "Collab test set", "Electronic");
      stream = await prisma.stream.findFirst({
        where: { id: created.id },
        include: { dj: { select: { displayName: true, username: true } } },
      });
    }
    if (!stream) return error("Could not create stream session", 500);

    const staleCollabs = await prisma.streamCollab.findMany({
      where: {
        partnerDjId: partner.id,
        stream: { djId: auth.id },
        status: { in: ["active", "pending"] },
        NOT: { streamId: stream.id },
      },
      select: { id: true },
    });
    for (const stale of staleCollabs) {
      await stopCollabWebRtcEgress(stale.id).catch(() => {});
      await prisma.streamCollab.update({
        where: { id: stale.id },
        data: { status: "ended" },
      });
    }

    const existingCollab = await prisma.streamCollab.findUnique({
      where: { streamId: stream.id },
      include: { partnerStream: true },
    });

    if (existingCollab?.status === "active") {
      return json({
        ok: true,
        step: "active",
        collabId: existingCollab.id,
        streamId: stream.id,
        partnerUsername: partner.username,
        message: "Collab already active — host and partner stream RTMP from /collab.",
      });
    }

    if (existingCollab?.status === "pending") {
      return json({
        ok: true,
        step: "waiting_accept",
        collabId: existingCollab.id,
        partnerUsername: partner.username,
        message: `Waiting for @${partner.username} to accept on /collab.`,
      });
    }

    const partnerBusy = await prisma.stream.findFirst({
      where: { djId: partner.id, status: { in: ["preparing", "live"] } },
    });
    if (partnerBusy) {
      return error(`@${partnerUsername} has an active stream — they must end it first`, 409);
    }

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
      stream.dj?.displayName ?? auth.displayName ?? auth.username,
      stream.dj?.username ?? auth.username,
      stream.title,
      body.splitRatio,
    );

    return json({
      ok: true,
      step: "invite_sent",
      collabId: collabRecord.id,
      streamId: stream.id,
      partnerUsername: partner.username,
      message: `Invite sent to @${partner.username}. They open /collab and tap Accept.`,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Partner username required");
    console.error("collab quick-start:", e);
    return error("Quick setup failed", 500);
  }
}
