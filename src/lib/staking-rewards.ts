/** Split a milestone reward pool across stakers proportional to stake size. */

export type StakerShare = { fanId: string; amount: number };

export function distributeProportionalRewards(
  stakers: StakerShare[],
  rewardPool: number,
): Map<string, number> {
  const rewards = new Map<string, number>();
  if (rewardPool <= 0 || stakers.length === 0) return rewards;

  const totalStaked = stakers.reduce((sum, s) => sum + s.amount, 0);
  if (totalStaked <= 0) return rewards;

  let distributed = 0;
  const sorted = [...stakers].sort((a, b) => b.amount - a.amount);

  for (let i = 0; i < sorted.length; i++) {
    const staker = sorted[i];
    let share: number;
    if (i === sorted.length - 1) {
      share = Math.max(0, rewardPool - distributed);
    } else {
      share = Math.floor((staker.amount / totalStaked) * rewardPool);
    }
    if (share > 0) {
      rewards.set(staker.fanId, (rewards.get(staker.fanId) ?? 0) + share);
      distributed += share;
    }
  }

  return rewards;
}

/** Estimate a staker's share of a reward pool (for UI previews). */
export function estimateProportionalShare(
  myStake: number,
  totalStaked: number,
  rewardPool: number,
): number {
  if (myStake <= 0 || totalStaked <= 0 || rewardPool <= 0) return 0;
  return Math.max(1, Math.floor((myStake / totalStaked) * rewardPool));
}
