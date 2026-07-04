import { prisma } from "@/lib/db";
import { getChatHub, serializeChatMessage } from "@/lib/chat-hub";
import { enrichChatPayloads } from "@/lib/staker-perks";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;

  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream) {
    return new Response("Stream not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const hub = getChatHub();

  const streamBody = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const history = await prisma.chatMessage.findMany({
          where: { streamId },
          orderBy: { createdAt: "asc" },
          take: 100,
        });

        const enriched = await enrichChatPayloads(
          { djId: stream.djId, stationId: stream.stationId },
          history.map((m) => serializeChatMessage(m)),
        );

        send({ type: "history", messages: enriched });

        const unsubscribe = hub.subscribe(streamId, (message) => {
          send({ type: "message", message });
        });

        const ping = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            clearInterval(ping);
          }
        }, 15000);

        request.signal.addEventListener("abort", () => {
          clearInterval(ping);
          unsubscribe();
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
      } catch {
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      }
    },
  });

  return new Response(streamBody, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
