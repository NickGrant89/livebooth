import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  bpm: z.number().optional(),
  musicalKey: z.string().optional(),
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

    const stream = await prisma.stream.findFirst({
      where: { id: streamId, djId: auth.id, status: "live" },
    });
    if (!stream) return error("Stream not found or not yours", 404);

    const nowPlaying = await prisma.nowPlaying.upsert({
      where: { streamId: stream.id },
      create: {
        streamId: stream.id,
        title: body.title,
        artist: body.artist,
        bpm: body.bpm,
        musicalKey: body.musicalKey,
      },
      update: {
        title: body.title,
        artist: body.artist,
        bpm: body.bpm,
        musicalKey: body.musicalKey,
      },
    });

    return json({ nowPlaying });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid track info");
    return error("Update failed", 500);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;
  const np = await prisma.nowPlaying.findUnique({ where: { streamId } });
  if (!np) return json({ nowPlaying: null });
  return json({
    nowPlaying: {
      title: np.title,
      artist: np.artist,
      bpm: np.bpm,
      key: np.musicalKey,
    },
  });
}
