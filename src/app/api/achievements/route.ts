import { getAchievementsForUser, evaluateAchievements, ensureAchievementCatalog } from "@/lib/achievements";
import { claimAchievementReward } from "@/lib/ledger";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  await ensureAchievementCatalog();
  await evaluateAchievements(auth.id);
  const achievements = await getAchievementsForUser(auth.id);
  return json({ achievements });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { achievementId } = (await request.json()) as { achievementId: string };
  if (!achievementId) return error("achievementId required");

  const result = await claimAchievementReward(auth.id, achievementId);
  if (!result) return error("Cannot claim", 400);

  return json({ ok: true, claimedAt: result.claimedAt });
}
