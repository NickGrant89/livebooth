import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { getFanStreamPricing } from "@/lib/subscriptions";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const streamId = new URL(request.url).searchParams.get("streamId");
  if (!streamId) return error("streamId required", 400);

  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream) return error("Stream not found", 404);

  const pricing = await getFanStreamPricing(auth.id, stream.djId);
  return json(pricing);
}
