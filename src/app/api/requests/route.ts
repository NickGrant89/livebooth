import {
  processCrowdRequest,
  resolveCrowdRequest,
} from "@/lib/ledger";
import { evaluateAchievements } from "@/lib/achievements";
import { broadcastChatMessageWithProfile } from "@/lib/chat-profiles";
import { isVipSubscriber, getFanStreamPricing } from "@/lib/subscriptions";
import { REQUEST_COST } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { z } from "zod";

function parseTrackInput(raw: string) {
  const trimmed = raw.trim();
  const dash = trimmed.match(/^(.+?)\s[-–—]\s(.+)$/);
  if (dash) {
    return { trackArtist: dash[1].trim(), trackTitle: dash[2].trim() };
  }
  return { trackTitle: trimmed, trackArtist: undefined as string | undefined };
}

const createSchema = z.object({
  streamId: z.string(),
  trackTitle: z.string().min(1),
  trackArtist: z.string().optional(),
  amount: z.number().positive().default(REQUEST_COST),
});

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const streamId = searchParams.get("streamId");

  if (streamId) {
    const stream = await prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) return error("Not found", 404);

    const myPosition = searchParams.get("myPosition") === "1";
    if (myPosition) {
      const pending = await prisma.crowdRequest.findMany({
        where: { streamId, status: "pending" },
        orderBy: { createdAt: "asc" },
      });
      const withVip = await Promise.all(
        pending.map(async (r) => ({
          id: r.id,
          fanId: r.fanId,
          vip: await isVipSubscriber(r.fanId, stream.djId),
          createdAt: r.createdAt,
        })),
      );
      withVip.sort((a, b) => {
        if (a.vip !== b.vip) return a.vip ? -1 : 1;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
      const mine = withVip.findIndex((r) => r.fanId === auth.id);
      return json({
        position: mine >= 0 ? mine + 1 : null,
        queueLength: withVip.length,
      });
    }

    if (stream.djId !== auth.id) return error("Forbidden", 403);

    const requests = await prisma.crowdRequest.findMany({
      where: { streamId, status: "pending" },
      include: { fan: { select: { username: true, displayName: true } } },
      orderBy: { createdAt: "asc" },
    });

    const sorted = await Promise.all(
      requests.map(async (r) => ({
        r,
        vip: await isVipSubscriber(r.fanId, stream.djId),
      })),
    );
    sorted.sort((a, b) => {
      if (a.vip !== b.vip) return a.vip ? -1 : 1;
      return a.r.createdAt.getTime() - b.r.createdAt.getTime();
    });

    return json({
      requests: sorted.map(({ r, vip }) => ({
        id: r.id,
        trackTitle: r.trackTitle,
        trackArtist: r.trackArtist,
        amount: r.amount,
        fan: r.fan.displayName,
        vip,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  }

  const myRequests = await prisma.crowdRequest.findMany({
    where: { fanId: auth.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return json({ requests: myRequests });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = createSchema.parse(await request.json());
    const { trackTitle, trackArtist } = parseTrackInput(body.trackTitle);

    const stream = await prisma.stream.findUnique({ where: { id: body.streamId } });
    if (!stream || stream.status !== "live") return error("Stream not live", 404);

    const pricing = await getFanStreamPricing(auth.id, stream.djId, stream.stationId);
    const amount = body.amount ?? pricing.requestCost;
    if (amount < pricing.requestCost) {
      return error(`VIP request cost is ${pricing.requestCost} DROP`, 400);
    }

    const req = await processCrowdRequest(
      auth.id,
      body.streamId,
      trackTitle,
      trackArtist ?? body.trackArtist,
      amount,
    );
    if (!req) return error(`Insufficient DROP (need ${pricing.requestCost})`, 402);

    const label =
      (trackArtist ?? body.trackArtist)
        ? `${trackArtist ?? body.trackArtist} — ${trackTitle}`
        : trackTitle;

    const chatMsg = await prisma.chatMessage.create({
      data: {
        streamId: body.streamId,
        userId: auth.id,
        username: auth.username,
        message: `🎵 requested: ${label} (${body.amount} DROP)`,
      },
    });
    await broadcastChatMessageWithProfile(body.streamId, chatMsg);

    return json({ request: { id: req.id, status: req.status, trackTitle, trackArtist } });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Request failed", 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { requestId, accept } = (await request.json()) as {
    requestId: string;
    accept: boolean;
  };

  const result = await resolveCrowdRequest(requestId, auth.id, accept);
  if (!result) return error("Cannot resolve request", 400);

  if (accept) await evaluateAchievements(result.fanId);

  return json({ request: { id: result.id, status: result.status } });
}
