import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { reportStream } from "@/lib/moderation";
import { z } from "zod";

const schema = z.object({
  reason: z.enum(["inappropriate", "copyright", "spam", "other"]),
  details: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { streamId } = await params;

  try {
    const body = schema.parse(await request.json());
    const result = await reportStream(streamId, auth.id, body.reason, body.details);
    if (!result.ok) return error(result.error, 400);
    return json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid report");
    return error("Report failed", 500);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { status: true, reportCount: true, moderationStatus: true },
  });
  if (!stream) return error("Stream not found", 404);
  return json(stream);
}
