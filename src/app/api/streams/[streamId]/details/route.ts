import { z } from "zod";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { updateStreamDetails } from "@/lib/stream-details";
import { STREAM_DESCRIPTION_MAX, STREAM_TITLE_MAX } from "@/lib/constants";

const schema = z.object({
  title: z.string().min(1).max(STREAM_TITLE_MAX).optional(),
  description: z.string().max(STREAM_DESCRIPTION_MAX).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { streamId } = await params;

  try {
    const body = schema.parse(await request.json());
    const result = await updateStreamDetails(streamId, auth.id, auth.role, body);
    if (!result.ok) return error(result.error, result.error === "Stream not found" ? 404 : 403);
    return json({ stream: result.stream });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid stream details");
    console.error("stream details patch:", e);
    return error("Failed to update stream", 500);
  }
}
