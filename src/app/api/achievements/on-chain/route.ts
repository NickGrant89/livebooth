import { prisma } from "@/lib/db";
import { evaluateAchievements } from "@/lib/achievements";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { z } from "zod";

const schema = z.object({
  achievementId: z.string(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = schema.parse(await request.json());

    const ua = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId: auth.id, achievementId: body.achievementId } },
    });
    if (!ua?.unlockedAt) return error("Achievement not unlocked", 400);
    if (ua.claimedAt) return error("Already claimed", 400);

    await prisma.userAchievement.update({
      where: { id: ua.id },
      data: { claimedAt: new Date(), claimTxHash: body.txHash },
    });

    return json({ ok: true, txHash: body.txHash });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Confirm failed", 500);
  }
}
