import { prisma } from "@/lib/db";
import { json, error, serializeStream } from "@/lib/api-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const stream = await prisma.stream.findUnique({
    where: { id },
    include: { dj: true, nowPlaying: true },
  });
  if (!stream) return error("Not found", 404);
  return json(serializeStream(stream));
}
