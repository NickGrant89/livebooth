import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { claimQuest, getOrAssignDailyQuests } from "@/lib/quests";
import { z } from "zod";

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const quests = await getOrAssignDailyQuests(auth.id);
  const claimed = quests.filter((q) => q.claimedAt).length;
  const completable = quests.filter(
    (q) => q.progress >= q.target && !q.claimedAt,
  ).length;

  return json({
    quests: quests.map((q) => ({
      id: q.id,
      questKey: q.questKey,
      label: q.label,
      target: q.target,
      progress: q.progress,
      reward: q.reward,
      completed: q.progress >= q.target,
      claimed: Boolean(q.claimedAt),
    })),
    claimedCount: claimed,
    completableCount: completable,
    dailyClear: claimed === 3,
  });
}

const claimSchema = z.object({
  questId: z.string(),
  streamId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = claimSchema.parse(await request.json());
    const result = await claimQuest(auth.id, body.questId, body.streamId);
    if (!result.ok) return error(result.error);
    return json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Claim failed", 500);
  }
}
