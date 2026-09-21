import {
  DROP_TOKEN_SYMBOL,
  MEMBER_DJ_CREATOR_SHARE,
  MEMBER_PLATFORM_SHARE,
  MEMBER_STATION_OWNER_SHARE,
  MEMBER_TIER_PRICES,
} from "./constants";

const djSharePct = Math.round(MEMBER_DJ_CREATOR_SHARE * 100);
const platformSharePct = Math.round(MEMBER_PLATFORM_SHARE * 100);
const stationOwnerSharePct = Math.round(MEMBER_STATION_OWNER_SHARE * 100);

/** Fan membership & creator monetization copy (creator-platform tone). */
export const MEMBERSHIP_COPY = {
  stationTitle: "Subscribe to this station",
  stationHint: `From ${MEMBER_TIER_PRICES.member} ${DROP_TOKEN_SYMBOL}/month — fan perks on every resident show. About ${stationOwnerSharePct}% supports the station each billing cycle.`,
  djTitle: "Subscribe to this creator",
  djHint: `From ${MEMBER_TIER_PRICES.member} ${DROP_TOKEN_SYMBOL}/month — chat badge, early replays, and discounts. You keep about ${djSharePct}% of each payment (${platformSharePct}% platform).`,
  ownerMilestones: "Member milestone rewards",
  memberTierLabel: "Member",
  supporterTierLabel: "Supporter",
  djJoinButton: "Subscribe — support monthly",
  stationJoinButton: "Join as member",
  signInToJoin: "Sign in to subscribe",
  streamPromoDjCta: "Subscribe",
  streamPromoStationCta: "Join membership",
  streamPromoSignIn: "Sign in to subscribe",
  vodCtaTitle: "Enjoyed the set?",
  vodCtaBody:
    "Subscribe for early replays, member chat badges, and discounts on unlocks — like supporting a creator you follow.",
  vodStationCta: "Station membership",
  vodDjCta: "Subscribe to DJ",
  earlyAccessStationCta: "Join station membership",
  earlyAccessDjCta: "Subscribe to creator",
  communityGoalLabel: "Fan support goal",
  communityGoalHostHint: "Your audience sees this — it grows as members subscribe.",
} as const;

/** Creator dashboard monetization panel */
export const CREATOR_MONETIZATION_COPY = {
  title: "Earn from your audience",
  intro:
    "Get paid the way creator platforms do — recurring fan subscriptions, live tips, and optional brand placement.",
  membershipTitle: "Fan subscriptions",
  membershipBody: `Fans subscribe at Member (${MEMBER_TIER_PRICES.member} ${DROP_TOKEN_SYMBOL}/mo) or Supporter (${MEMBER_TIER_PRICES.supporter} ${DROP_TOKEN_SYMBOL}/mo). You keep ${djSharePct}% of membership revenue; we handle billing and perks.`,
  tipsTitle: "Live tips & unlocks",
  tipsBody: `Fans tip during sets and pay to unlock tracks or requests. You keep most of each tip; earnings land in your wallet instantly.`,
  payoutTitle: "Get paid out",
  payoutBody: "Connect Stripe on your wallet page, then request a payout when you're ready — eligible earnings convert to real money.",
  brandTitle: "Brand placement",
  brandLive: "Use Promote booth below to feature your stream on Discover — hero or grid spots.",
  brandOffline: "Go live, then use Promote booth for hero or grid spots on Discover.",
  adsTitle: "In-stream sponsors",
  adsBody: "Platform-managed sponsor banner under the player (when enabled).",
  adsLink: "Partner with us",
} as const;

/** @deprecated */
export const STAKING_COPY = MEMBERSHIP_COPY;
export const STAKING_V2_ENABLED = true;
export const STAKING_DEEMPHASIZED = false;
