import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { z } from "zod";

const inviteSchema = z.object({
  streamId: z.string(),
  partnerUsername: z.string(),
  splitRatio: z.number().min(0.1).max(0.9).default(0.5),
});

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const collabs = await prisma.streamCollab.findMany({
    where: {
      OR: [
        { stream: { djId: auth.id } },
        { partnerDjId: auth.id },
      ],
      status: { in: ["pending", "active"] },
    },
    include: {
      stream: { include: { dj: { select: { username: true, displayName: true } } } },
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
      };
    }),
  );

  return json({ collabs: withPartner });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = inviteSchema.parse(await request.json());
    const stream = await prisma.stream.findFirst({
      where: { id: body.streamId, djId: auth.id, status: "live" },
    });
    if (!stream) return error("No live stream found", 404);

    const partner = await prisma.user.findUnique({
      where: { username: body.partnerUsername },
    });
    if (!partner || partner.role !== "dj") return error("DJ not found", 404);
    if (partner.id === auth.id) return error("Cannot collab with yourself", 400);

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

    return json({ collab: { id: collabRecord.id, status: collabRecord.status } });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid invite");
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
  });
  if (!collab || collab.partnerDjId !== auth.id) return error("Not found", 404);

  return json({
    collab: await prisma.streamCollab.update({
      where: { id: collabId },
      data: { status: accept ? "active" : "declined" },
    }),
  });
}
