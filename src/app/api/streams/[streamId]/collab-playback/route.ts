import { json, error } from "@/lib/api-utils";
import { getCollabPlaybackState } from "@/lib/collab-playback";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;
  const state = await getCollabPlaybackState(streamId, { tryActivate: true });
  if (!state) return error("Stream not found", 404);
  return json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}
