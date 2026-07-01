import { json, isApiError } from "@/lib/api-utils";
import { requireAdminApi, getAdminStats } from "@/lib/admin";
import { evaluateAllLiveStreams } from "@/lib/moderation";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  await evaluateAllLiveStreams();
  const stats = await getAdminStats();
  return json(stats);
}
