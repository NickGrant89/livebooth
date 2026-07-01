import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  purchaseStreamPromotion,
  isPromotionActive,
  type PromotionTierId,
} from "@/lib/promotion";
import { PROMOTION_TIERS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { z } from "zod";

const postSchema = z.object({
  tier: z.enum(["grid", "hero"]),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { streamId } = await params;
  const stream = await prisma.stream.findFirst({
    where: { id: streamId, djId: auth.id },
    select: {
      promotionTier: true,
      promotedUntil: true,
      promotionDropAmount: true,
      status: true,
    },
  });
  if (!stream) return error("Stream not found", 404);

  return json({
    tiers: PROMOTION_TIERS,
    active: isPromotionActive(stream),
    promotionTier: stream.promotionTier,
    promotedUntil: stream.promotedUntil?.toISOString() ?? null,
    totalSpent: stream.promotionDropAmount,
    isLive: stream.status === "live",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { streamId } = await params;

  try {
    const body = postSchema.parse(await request.json());
    const result = await purchaseStreamPromotion(
      streamId,
      auth.id,
      body.tier as PromotionTierId,
    );
    if (!result.ok) return error(result.error, 402);
    return json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid tier");
    return error("Promotion failed", 500);
  }
}
