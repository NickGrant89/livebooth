import { prisma } from "./db";
import { creditUser } from "./ledger";
import { QUEST_DAILY_CLEAR_BONUS } from "./constants";

export const QUEST_TEMPLATES = {
  "watch-10": { label: "Warm up", target: 10, reward: 3, metric: "watch_minutes" as const },
  "watch-30": { label: "Deep listen", target: 30, reward: 8, metric: "watch_minutes" as const },
  "first-tip-day": { label: "Tip the drop", target: 1, reward: 5, metric: "tips_count" as const },
  "tip-25": { label: "Show love", target: 25, reward: 10, metric: "tips_drop" as const },
  "unlock-1": { label: "Track ID", target: 1, reward: 7, metric: "unlocks" as const },
  "chat-3": { label: "In the booth", target: 3, reward: 3, metric: "chat" as const },
  "follow-1": { label: "New voice", target: 1, reward: 4, metric: "follows" as const },
  "claim-daily": { label: "Show up", target: 1, reward: 3, metric: "daily_claim" as const },
} as const;

export type QuestKey = keyof typeof QUEST_TEMPLATES;
export type QuestMetric = (typeof QUEST_TEMPLATES)[QuestKey]["metric"];

function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

const DAILY_POOL: QuestKey[] = [
  "watch-10",
  "watch-30",
  "first-tip-day",
  "tip-25",
  "unlock-1",
  "chat-3",
  "follow-1",
  "claim-daily",
];

function pickDailyQuests(balance: number): QuestKey[] {
  const pool = [...DAILY_POOL];
  if (balance < 25) {
    const i = pool.indexOf("tip-25");
    if (i >= 0) pool.splice(i, 1);
  }
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const easy: QuestKey[] = ["watch-10", "chat-3", "claim-daily", "follow-1"];
  const picked: QuestKey[] = [];
  const firstEasy = shuffled.find((k) => easy.includes(k)) ?? shuffled[0];
  picked.push(firstEasy);
  for (const k of shuffled) {
    if (picked.length >= 3) break;
    if (!picked.includes(k)) picked.push(k);
  }
  while (picked.length < 3 && pool.length > picked.length) {
    const k = pool.find((x) => !picked.includes(x));
    if (!k) break;
    picked.push(k);
  }
  return picked.slice(0, 3);
}

export async function getOrAssignDailyQuests(userId: string) {
  const questDate = utcDateKey();
  let rows = await prisma.fanQuestProgress.findMany({
    where: { userId, questDate },
    orderBy: { slot: "asc" },
  });

  if (rows.length === 0) {
    const bal = await prisma.beatBalance.findUnique({ where: { userId } });
    const keys = pickDailyQuests(bal?.balance ?? 0);
    rows = await Promise.all(
      keys.map((questKey, slot) => {
        const t = QUEST_TEMPLATES[questKey];
        return prisma.fanQuestProgress.create({
          data: {
            userId,
            questDate,
            questKey,
            slot,
            label: t.label,
            target: t.target,
            reward: t.reward,
          },
        });
      }),
    );
  }

  return rows;
}

export async function bumpQuestProgress(
  userId: string,
  metric: QuestMetric,
  amount = 1,
) {
  const questDate = utcDateKey();
  const quests = await prisma.fanQuestProgress.findMany({
    where: { userId, questDate, claimedAt: null },
  });

  for (const q of quests) {
    const template = QUEST_TEMPLATES[q.questKey as QuestKey];
    if (!template || template.metric !== metric) continue;

    const progress = Math.min(q.target, q.progress + amount);
    const completedAt =
      progress >= q.target && !q.completedAt ? new Date() : q.completedAt;

    await prisma.fanQuestProgress.update({
      where: { id: q.id },
      data: { progress, completedAt },
    });
  }
}

export async function claimQuest(userId: string, questId: string, streamId?: string) {
  const quest = await prisma.fanQuestProgress.findFirst({
    where: { id: questId, userId },
  });
  if (!quest) return { ok: false as const, error: "Quest not found" };
  if (quest.claimedAt) return { ok: false as const, error: "Already claimed" };
  if ((quest.progress ?? 0) < quest.target) {
    return { ok: false as const, error: "Quest not complete" };
  }

  let claimedStreamId = streamId;
  if (!claimedStreamId) {
    const presence = await prisma.streamPresence.findFirst({
      where: { userId, stream: { status: "live" } },
      orderBy: { lastSeen: "desc" },
    });
    claimedStreamId = presence?.streamId;
  }

  await creditUser(userId, quest.reward, "quest_reward", quest.id, {
    questKey: quest.questKey,
    streamId: claimedStreamId,
  });
  await prisma.fanQuestProgress.update({
    where: { id: quest.id },
    data: { claimedAt: new Date(), claimedStreamId: claimedStreamId ?? null },
  });

  const questDate = quest.questDate;
  const all = await prisma.fanQuestProgress.findMany({
    where: { userId, questDate },
  });
  const allClaimed = all.length === 3 && all.every((q) => q.claimedAt || q.id === quest.id);
  let dailyClearBonus = 0;
  if (allClaimed) {
    const already = await prisma.ledgerEntry.findFirst({
      where: {
        userId,
        type: "quest_daily_clear",
        reference: questDate,
      },
    });
    if (!already) {
      dailyClearBonus = QUEST_DAILY_CLEAR_BONUS;
      await creditUser(userId, dailyClearBonus, "quest_daily_clear", questDate);
    }
  }

  return {
    ok: true as const,
    reward: quest.reward,
    dailyClearBonus,
  };
}
