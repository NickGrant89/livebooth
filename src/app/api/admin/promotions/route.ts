import { z } from "zod";
import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { getAdminPromotions } from "@/lib/admin-promotions";
import { cancelStreamPromotion } from "@/lib/promotion";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const data = await getAdminPromotions();
  return json(data);
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), streamId: z.string() }),
]);

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = actionSchema.parse(await request.json());

    if (body.action === "cancel") {
      const stream = await prisma.stream.findUnique({
        where: { id: body.streamId },
        select: { id: true, promotionTier: true, promotedUntil: true },
      });
      if (!stream?.promotionTier) {
        return error("Stream has no active promotion", 404);
      }

      await cancelStreamPromotion(body.streamId);
      await logAdminAction(admin.id, "promotion_cancel", body.streamId, {
        tier: stream.promotionTier,
      }, request);
      return json({ ok: true });
    }

    return error("Unknown action", 400);
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Promotion action failed", 500);
  }
}
