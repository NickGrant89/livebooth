/** Staker membership perks (v2) — enabled in beta once perks ship. */
export const STAKING_V2_ENABLED = process.env.NEXT_PUBLIC_BETA_MODE === "true";

export const STAKING_DEEMPHASIZED = false;

export const STAKING_COPY = {
  stationTitle: "Become a station member",
  stationHint:
    "Lock 50+ DROP for chat badge, cheaper unlocks, early replays, and milestone rewards. Unstake anytime.",
  djTitle: "Back this DJ",
  djHint:
    "Lock 50+ DROP for supporter perks — early replays, cheaper unlocks, milestone rewards. Unstake anytime.",
  ownerMilestones: "Member milestone rewards",
} as const;
