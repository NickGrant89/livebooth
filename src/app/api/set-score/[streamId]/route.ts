import { json, error } from "@/lib/api-utils";
import { computeLiveSetScore } from "@/lib/set-score";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;
  const data = await computeLiveSetScore(streamId);
  if (!data) return error("Not found or stream ended", 404);
  return json(data);
}
