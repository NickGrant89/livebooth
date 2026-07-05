import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { tryActivateCollabCompositor } from "@/lib/collab-compositor";
import { z } from "zod";

const schema = z.object({
  collabId: z.string().min(1),
});

/** Manually trigger compositor activation (host/partner dashboard or retry). */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = schema.parse(await request.json());
    const collab = await prisma.streamCollab.findUnique({
      where: { id: body.collabId },
      include: { stream: { select: { djId: true } } },
    });
    if (!collab) return error("Collab not found", 404);
    if (collab.stream.djId !== auth.id && collab.partnerDjId !== auth.id && auth.role !== "admin") {
      return error("Not allowed", 403);
    }

    const result = await tryActivateCollabCompositor(body.collabId);
    return json({ compositor: result });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    console.error("collab compositor activate:", e);
    return error("Compositor activation failed", 500);
  }
}
