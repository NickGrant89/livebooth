import { json, error } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { computeLiveSetScore, computeSetScore } from "@/lib/set-score";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { status: true, setGrade: true, setScore: true },
  });
  if (!stream) return error("Not found", 404);

  if (stream.status === "live") {
    const data = await computeLiveSetScore(streamId);
    if (!data) return error("Not found or stream ended", 404);
    return json(data);
  }

  if (stream.status === "ended") {
    if (stream.setGrade != null && stream.setScore != null) {
      return json({
        score: stream.setScore,
        grade: stream.setGrade,
        breakdown: null,
        par: null,
        streamCount: null,
        gradePace: null,
      });
    }
    const scored = await computeSetScore(streamId);
    if (!scored) return error("Could not compute score", 404);
    return json({
      score: scored.setScore,
      grade: scored.setGrade,
      breakdown: scored.breakdown,
      par: scored.par,
      streamCount: null,
      gradePace: null,
    });
  }

  return error("Not found or stream ended", 404);
}
