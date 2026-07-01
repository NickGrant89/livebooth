import { getSessionUser } from "@/lib/auth";
import { processTip } from "@/lib/ledger";
import { evaluateAchievements } from "@/lib/achievements";
import { bumpQuestProgress } from "@/lib/quests";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  streamId: z.string(),
  amount: z.number().positive(),
  message: z.string().optional(),
  timestampMs: z.number().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const limited = enforceRateLimit(request, "tips", 30, 60 * 1000, auth.id);
  if (limited) return limited;

  try {
    const body = schema.parse(await request.json());

    const stream = await prisma.stream.findUnique({
      where: { id: body.streamId },
    });
    if (!stream || stream.status !== "live") return error("Stream not live", 404);

    const tip = await processTip(
      auth.id,
      stream.djId,
      stream.id,
      body.amount,
      body.message,
      body.timestampMs,
    );
    if (!tip) return error("Insufficient DROP balance", 402);

    await bumpQuestProgress(auth.id, "tips_count", 1);
    await bumpQuestProgress(auth.id, "tips_drop", body.amount);

    const fanUnlocks = await evaluateAchievements(auth.id);
    const djUnlocks = await evaluateAchievements(stream.djId);

    return json({
      tip: { id: tip.id, amount: tip.amount, timestampMs: tip.timestampMs },
      balanceUpdated: true,
      unlockedAchievements: fanUnlocks,
      djUnlockedAchievements: djUnlocks,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid tip");
    console.error("tips:", e);
    return error("Tip failed", 500);
  }
}
