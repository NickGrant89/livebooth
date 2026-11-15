import { isApiError } from "@/lib/api-utils";
import { requireModeratorPermissionApi } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { fetchLiveSnapshot } from "@/lib/recording-clip";

export async function GET(request: Request) {
  const staff = await requireModeratorPermissionApi(request, "moderation");
  if (isApiError(staff)) return staff;

  const streamId = new URL(request.url).searchParams.get("streamId") ?? "";
  if (!streamId) return new Response("Missing stream", { status: 400 });

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { ingestKey: true, status: true },
  });
  if (!stream || stream.status !== "live") {
    return new Response("Stream is not live", { status: 404 });
  }

  const frame = await fetchLiveSnapshot(stream.ingestKey ?? "");
  if (!frame) return new Response("No picture yet", { status: 404 });

  return new Response(new Uint8Array(frame.jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
