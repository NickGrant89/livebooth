import { json } from "@/lib/api-utils";
import { fetchDiscoverLiveStreams } from "@/lib/discover-home";

export async function GET(request: Request) {
  const genre = new URL(request.url).searchParams.get("genre") ?? undefined;
  const streams = await fetchDiscoverLiveStreams(genre || undefined);
  return json({ streams, updatedAt: new Date().toISOString() });
}
