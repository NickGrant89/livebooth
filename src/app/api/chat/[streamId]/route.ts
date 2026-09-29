import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { bumpQuestProgress } from "@/lib/quests";
import { serializeChatMessage } from "@/lib/chat-hub";
import { broadcastChatMessageWithProfile } from "@/lib/chat-profiles";
import { isUserBannedFromStream } from "@/lib/chat-moderation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { enrichChatPayloads, getStakerBadgeForStream } from "@/lib/staker-perks";
import { z } from "zod";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CHAT_JSON_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
} as const;

function chatJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CHAT_JSON_HEADERS });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;
  const { searchParams } = new URL(request.url);
  const afterId = searchParams.get("afterId");
  const since = searchParams.get("since");

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { djId: true, stationId: true },
  });
  if (!stream) return error("Stream not found", 404);

  let rows: Awaited<ReturnType<typeof prisma.chatMessage.findMany>>;

  if (afterId) {
    const cursor = await prisma.chatMessage.findUnique({
      where: { id: afterId },
      select: { createdAt: true, streamId: true },
    });
    if (cursor?.streamId === streamId) {
      const window = await prisma.chatMessage.findMany({
        where: { streamId, createdAt: { gte: cursor.createdAt } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 101,
      });
      const idx = window.findIndex((m) => m.id === afterId);
      rows =
        idx >= 0
          ? window.slice(idx + 1)
          : window.filter((m) => m.createdAt.getTime() > cursor.createdAt.getTime());
    } else {
      rows = await prisma.chatMessage.findMany({
        where: { streamId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 100,
      });
    }
  } else if (since) {
    rows = await prisma.chatMessage.findMany({
      where: { streamId, createdAt: { gte: new Date(since) } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 100,
    });
  } else {
    rows = await prisma.chatMessage.findMany({
      where: { streamId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 100,
    });
  }

  const messages = rows.slice(0, 100);

  const enriched = await enrichChatPayloads(
    { djId: stream.djId, stationId: stream.stationId },
    messages.map((m) => serializeChatMessage(m)),
  );

  return chatJson({ messages: enriched });
}

const postSchema = z.object({ message: z.string().min(1).max(500) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const limited = enforceRateLimit(request, "chat", 40, 60 * 1000, auth.id);
  if (limited) return limited;

  const { streamId } = await params;

  try {
    const body = postSchema.parse(await request.json());

    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      select: { status: true, djId: true, stationId: true },
    });
    if (!stream || stream.status !== "live") return error("Stream not live", 404);

    if (await isUserBannedFromStream(streamId, auth.id)) {
      return error("You are banned from chat on this stream", 403);
    }

    const msg = await prisma.chatMessage.create({
      data: {
        streamId,
        userId: auth.id,
        username: auth.username,
        message: body.message,
      },
    });

    const stakerBadge = await getStakerBadgeForStream(auth.id, stream);
    await broadcastChatMessageWithProfile(streamId, msg, stakerBadge);

    const [enriched] = await enrichChatPayloads(stream, [serializeChatMessage(msg, stakerBadge)]);

    try {
      await bumpQuestProgress(auth.id, "chat", 1);
    } catch {
      /* quest progress must not block chat delivery */
    }

    return chatJson({ message: enriched });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid message");
    return error("Failed to send message", 500);
  }
}
