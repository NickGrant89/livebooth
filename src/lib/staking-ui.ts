/** Beta: staking stays available but de-emphasized until perks are stronger. */
export const STAKING_DEEMPHASIZED =
  process.env.NEXT_PUBLIC_BETA_MODE === "true" &&
  process.env.NEXT_PUBLIC_DEMO_MODE !== "true";

export const STAKING_COPY = {
  stationTitle: "Back this station (optional)",
  stationHint:
    "Lock DROP to help hit community milestones — you can unstake anytime. Tips pay DJs and the station directly.",
  djTitle: "Back this DJ (optional)",
  djHint: "Show support without spending — unstake anytime. Tips are the main way to pay creators.",
  ownerMilestones: "Staker milestones (optional beta feature)",
} as const;
