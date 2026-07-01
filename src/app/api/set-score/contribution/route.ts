import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { computeFanContribution } from "@/lib/fan-contribution";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const streamId = new URL(request.url).searchParams.get("streamId");
  if (!streamId) return error("streamId required", 400);

  const contribution = await computeFanContribution(streamId, auth.id);
  return json({ contribution });
}
