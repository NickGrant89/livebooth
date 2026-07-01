import { claimDailyLogin } from "@/lib/retention";
import { bumpQuestProgress } from "@/lib/quests";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";

export async function POST() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const result = await claimDailyLogin(auth.id);
  if (!result.ok) {
    return error(result.error, result.alreadyClaimed ? 409 : 400);
  }
  await bumpQuestProgress(auth.id, "daily_claim", 1);
  return json({ amount: result.amount, message: `+${result.amount} DROP for showing up today` });
}

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { prisma } = await import("@/lib/db");
  const user = await prisma.user.findUnique({ where: { id: auth.id } });
  const todayUtc = new Date().toISOString().slice(0, 10);
  const claimed = user?.lastDailyClaimAt?.toISOString().slice(0, 10) === todayUtc;

  return json({ claimedToday: claimed, reward: 5 });
}
