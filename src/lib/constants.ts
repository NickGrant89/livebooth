export const DROP_TOKEN_SYMBOL = "DROP";

export const PLATFORM_FEE_TIP = 0.1;
export const PLATFORM_FEE_UNLOCK = 0.15;
export const PLATFORM_FEE_REQUEST = 0.15;
export const DJ_SHARE = 1 - PLATFORM_FEE_TIP;
export const TRACK_UNLOCK_COST = 5;
export const REQUEST_COST = 10;
export const VIP_SUB_COST = 10;
export const VIP_DISCOUNT = 0.3;
export const VIP_REQUEST_COST = Math.ceil(REQUEST_COST * (1 - VIP_DISCOUNT));
export const VIP_TRACK_UNLOCK_COST = Math.ceil(TRACK_UNLOCK_COST * (1 - VIP_DISCOUNT));

/** Stripe test-mode packs — 1 DROP ≈ $0.05 */
export const DROP_PACKS = [
  { id: "drop_100", dropAmount: 100, priceCents: 499, label: "100 DROP", popular: false },
  { id: "drop_500", dropAmount: 500, priceCents: 1999, label: "500 DROP", popular: true },
  { id: "drop_1000", dropAmount: 1000, priceCents: 3499, label: "1,000 DROP", popular: false },
] as const;

export type DropPackId = (typeof DROP_PACKS)[number]["id"];
export const WELCOME_BONUS = 500;

export const APP_NAME = "LiveBooth";
export const APP_TAGLINE = "Tip the drop";

export const DAILY_LOGIN_DROP = 5;
export const FIRST_TIP_BONUS = 5;
export const HIGHLIGHT_TIP_MIN = 25;
export const STREAM_TITLE_MAX = 120;
export const STREAM_DESCRIPTION_MAX = 500;
export const MIN_STAKE_AMOUNT = 50;

/** Membership tiers (v3) — monthly recurring, revenue share to creators */
export type MemberTier = "member" | "supporter";

export const MEMBER_TIER_PRICES: Record<MemberTier, number> = {
  member: 25,
  supporter: 75,
};

/** @deprecated use MEMBER_TIER_PRICES.member */
export const MIN_MEMBERSHIP_AMOUNT = MEMBER_TIER_PRICES.member;

export const MEMBER_BILLING_DAYS = 30;
/** Days after a failed renewal before membership is cancelled; perks stay on during this window. */
export const MEMBER_PAST_DUE_GRACE_DAYS = 7;

export const MEMBER_DJ_CREATOR_SHARE = 0.85;
export const MEMBER_STATION_OWNER_SHARE = 0.75;
export const MEMBER_STATION_LIVE_DJ_SHARE = 0.1;
export const MEMBER_PLATFORM_SHARE = 0.15;

export const MEMBER_TIER_UNLOCK_DISCOUNT: Record<MemberTier, number> = {
  member: 0.1,
  supporter: 0.2,
};

export const MEMBER_TIER_REQUEST_DISCOUNT: Record<MemberTier, number> = {
  member: 0.1,
  supporter: 0.15,
};

export const MEMBER_TIER_TIP_GRADE_BOOST: Record<MemberTier, number> = {
  member: 1.1,
  supporter: 1.15,
};

export const STAKER_VOD_EARLY_HOURS = 24;
export const DJ_STAKER_VOD_EARLY_HOURS = 12;

export const DJ_MEMBER_COMMUNITY_GOAL = {
  targetMrr: 200,
  label: "30-day member replay vault",
  description: "When monthly member support hits 200 DROP, all DJ members unlock extended replays.",
} as const;

export const STATION_MEMBER_COMMUNITY_GOAL = {
  targetMrr: 500,
  label: "Extended station archive",
  description: "When monthly station members hit 500 DROP, every member gets longer replay access.",
} as const;

export const MEMBER_TIER_BADGE: Record<MemberTier, string> = {
  member: "Member",
  supporter: "Supporter",
};

export const MEMBER_PERKS_MEMBER = [
  "Member badge in live chat",
  "10% off track IDs & requests",
  "Early replay access",
  "85% of your fee supports the DJ each month",
  "Share in milestone DROP rewards",
] as const;

export const MEMBER_PERKS_SUPPORTER = [
  "Supporter badge + chat priority",
  "20% off track IDs, 15% off requests",
  "Request queue priority on live sets",
  "Early replay access",
  "85% of your fee supports the DJ each month",
] as const;

export const STATION_MEMBER_PERKS_MEMBER = [
  "Station member badge in chat",
  "10% off unlocks & requests on all station shows",
  "24h early replay on station shows",
  "75% of your fee supports the station each month",
  "Share in station milestone rewards",
] as const;

export const STATION_MEMBER_PERKS_SUPPORTER = [
  "Supporter badge on every station show",
  "20% off unlocks, 15% off requests",
  "Request priority during station live sets",
  "24h early replay on all station shows",
  "75% to station + 10% to the live DJ when you join during a show",
] as const;

/** @deprecated — use MEMBER_PERKS_* */
export const STAKER_UNLOCK_DISCOUNT = 0.15;
export const STAKER_REQUEST_DISCOUNT = 0.1;
export const STAKER_TIP_GRADE_BOOST = 1.1;
/** @deprecated — use MemberTier */
export const STAKER_TIER_CORE_MIN = 150;
export const STAKER_TIER_LEGEND_MIN = 500;

export const STAKER_PERKS = STATION_MEMBER_PERKS_MEMBER;
export const DJ_STAKER_PERKS = MEMBER_PERKS_MEMBER;

/** Station tip split: 70% DJ / 20% station / 10% platform */
export const STATION_TIP_DJ_SHARE = 0.7;
export const STATION_TIP_STATION_SHARE = 0.2;
export const STATION_TIP_PLATFORM_SHARE = 0.1;

/** Radio station program tiers */
export const RADIO_TIERS = {
  community: {
    id: "community",
    label: "Community",
    description: "Local FM simulcast or small internet radio",
    maxResidents: 5,
    relayMode: false,
    stationDashboard: true,
    whiteLabel: false,
  },
  pro: {
    id: "pro",
    label: "Pro",
    description: "Weekly residency lineup + relay alongside your encoder",
    maxResidents: 15,
    relayMode: true,
    stationDashboard: true,
    whiteLabel: false,
  },
  network: {
    id: "network",
    label: "Network",
    description: "Multi-show network with white-label player and staking",
    maxResidents: 50,
    relayMode: true,
    stationDashboard: true,
    whiteLabel: true,
  },
} as const;

export type RadioTierId = keyof typeof RADIO_TIERS;

/** Station staking milestones — reward pool split proportionally among stakers */
export const STATION_MILESTONES = [
  { key: "followers_25", metric: "followers" as const, threshold: 25, rewardPool: 40, label: "25 station followers" },
  { key: "followers_100", metric: "followers" as const, threshold: 100, rewardPool: 125, label: "100 station followers" },
  { key: "staked_500", metric: "staked" as const, threshold: 500, rewardPool: 150, label: "500 DROP staked on station" },
  { key: "staked_2000", metric: "staked" as const, threshold: 2000, rewardPool: 375, label: "2,000 DROP staked on station" },
  { key: "tips_1000", metric: "tips" as const, threshold: 1000, rewardPool: 200, label: "1,000 DROP tipped on shows" },
] as const;

export type StationMilestoneKey = (typeof STATION_MILESTONES)[number]["key"];

/** DJ staking milestones — reward pool split proportionally among stakers */
export const DJ_MILESTONES = [
  { key: "followers_50", metric: "followers" as const, threshold: 50, rewardPool: 100, label: "50 followers" },
  { key: "followers_250", metric: "followers" as const, threshold: 250, rewardPool: 300, label: "250 followers" },
  { key: "staked_500", metric: "staked" as const, threshold: 500, rewardPool: 150, label: "500 DROP staked on DJ" },
  { key: "staked_1500", metric: "staked" as const, threshold: 1500, rewardPool: 400, label: "1,500 DROP staked on DJ" },
  { key: "tips_500", metric: "tips" as const, threshold: 500, rewardPool: 200, label: "500 DROP tipped on streams" },
] as const;

export type DjMilestoneKey = (typeof DJ_MILESTONES)[number]["key"];

/** CSV columns for station schedule import */
export const STATION_SCHEDULE_CSV_HEADER =
  "dj_username,show_title,day,hour,slot_label";

/** Stream moderation — auto-stop when report threshold hit */
export const STREAM_REPORT_AUTO_STOP = 3;
export const STREAM_REPORT_WINDOW_MS = 15 * 60 * 1000;
/** Auto-stop live streams stuck on demo/placeholder feed (no real encoder) */
export const STREAM_DEMO_MAX_MINUTES = 45;

export const STREAM_REPORT_REASONS = [
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "copyright", label: "Copyright / DMCA" },
  { id: "spam", label: "Spam or misleading" },
  { id: "other", label: "Other" },
] as const;

export const SUPPORT_CATEGORIES = [
  { id: "account", label: "Account & login" },
  { id: "stream", label: "Streaming / OBS" },
  { id: "payment", label: "Wallet & DROP" },
  { id: "report", label: "Report content" },
  { id: "other", label: "Other" },
] as const;

/** AI video moderation — Hive / AWS Rekognition */
export const AI_MODERATION_RISK_STOP = 0.85;
export const AI_MODERATION_RISK_FLAG = 0.55;
export const AI_MODERATION_SCAN_INTERVAL_MS = 120_000;

/** Genre spotlight by UTC day (0 = Sunday) */
export const GENRE_NIGHTS: Record<number, { genre: string; label: string; emoji: string }> = {
  0: { genre: "ambient", label: "Chill Sunday", emoji: "🌙" },
  1: { genre: "techno", label: "Techno Monday", emoji: "🔊" },
  2: { genre: "house", label: "House Tuesday", emoji: "🏠" },
  3: { genre: "drum-bass", label: "DnB Wednesday", emoji: "⚡" },
  4: { genre: "hip-hop", label: "Hip-Hop Thursday", emoji: "🎤" },
  5: { genre: "trance", label: "Trance Friday", emoji: "✨" },
  6: { genre: "disco", label: "Disco Saturday", emoji: "🪩" },
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Paid discover placement — DJ spends DROP while live. */
export const PROMOTION_TIERS = {
  grid: {
    id: "grid" as const,
    label: "Boost grid",
    description: "Pin near top of Live Now for 1 hour",
    price: 75,
    durationMs: 60 * 60 * 1000,
    scoreBoost: 600,
  },
  hero: {
    id: "hero" as const,
    label: "Hero spotlight",
    description: "Sponsored hero banner on Discover for 1 hour (max 1 at a time)",
    price: 250,
    durationMs: 60 * 60 * 1000,
    scoreBoost: 15_000,
  },
};

export const DISCOVER_GENRE_NIGHT_BOOST = 300;
export const DISCOVER_FLAGSHIP_BOOST = 400;
export const QUEST_DAILY_CLEAR_BONUS = 10;

/** Fiat cash-out — redeem rate below buy rate (see doc 10). Buy ~5¢/DROP via packs. */
export const REDEEM_USD_CENTS_PER_DROP = Number(process.env.REDEEM_USD_CENTS_PER_DROP ?? "4.25");
export const WITHDRAWAL_FEE_BPS = 200;
export const WITHDRAWAL_MIN_DROP = Number(process.env.WITHDRAWAL_MIN_DROP ?? "500");
export const WITHDRAWAL_KYC_MONTHLY_USD_CENTS = 100_000;
export const WITHDRAWAL_MIN_ACCOUNT_AGE_DAYS = 7;

export function isDemoEconomyMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function isBetaMode(): boolean {
  return process.env.NEXT_PUBLIC_BETA_MODE === "true";
}

/** Show demo account hints in UI (login page, help). Off in production unless explicitly enabled. */
export function showDemoCredentials(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function effectiveWithdrawMinDrop(): number {
  return isDemoEconomyMode() ? 50 : WITHDRAWAL_MIN_DROP;
}

export const GENRES = [
  // Electronic & dance
  "house",
  "techno",
  "drum-bass",
  "trance",
  "disco",
  "ambient",
  "uk-garage",
  "dubstep",
  // Hip-hop & R&B
  "hip-hop",
  "r-and-b",
  "grime",
  // Rock & alternative
  "rock",
  "indie",
  "metal",
  "punk",
  "alternative",
  // Pop & acoustic
  "pop",
  "singer-songwriter",
  "acoustic",
  // Jazz, blues & soul
  "jazz",
  "blues",
  "soul",
  "funk",
  // Folk & country
  "folk",
  "country",
  // Latin & world
  "latin",
  "reggae",
  "afrobeats",
  // Live performance
  "live-band",
  "open-mic",
  // Other
  "talk",
  "other",
] as const;

export type Genre = (typeof GENRES)[number];

/** Grouped genres for profile + go-live pickers */
export const GENRE_GROUPS: { label: string; genres: Genre[] }[] = [
  {
    label: "Electronic & dance",
    genres: ["house", "techno", "drum-bass", "trance", "disco", "ambient", "uk-garage", "dubstep"],
  },
  {
    label: "Hip-hop & R&B",
    genres: ["hip-hop", "r-and-b", "grime"],
  },
  {
    label: "Rock & alternative",
    genres: ["rock", "indie", "metal", "punk", "alternative"],
  },
  {
    label: "Pop & acoustic",
    genres: ["pop", "singer-songwriter", "acoustic"],
  },
  {
    label: "Jazz, blues & soul",
    genres: ["jazz", "blues", "soul", "funk"],
  },
  {
    label: "Folk & country",
    genres: ["folk", "country"],
  },
  {
    label: "Latin & world",
    genres: ["latin", "reggae", "afrobeats"],
  },
  {
    label: "Live performance",
    genres: ["live-band", "open-mic"],
  },
  {
    label: "Other",
    genres: ["talk", "other"],
  },
];

export const genreLabels: Record<string, string> = {
  house: "House",
  techno: "Techno",
  "drum-bass": "Drum & Bass",
  "hip-hop": "Hip-Hop",
  trance: "Trance",
  disco: "Disco",
  ambient: "Ambient",
  "uk-garage": "UK Garage",
  dubstep: "Dubstep",
  "r-and-b": "R&B",
  grime: "Grime",
  rock: "Rock",
  indie: "Indie",
  metal: "Metal",
  punk: "Punk",
  alternative: "Alternative",
  pop: "Pop",
  "singer-songwriter": "Singer-songwriter",
  acoustic: "Acoustic",
  jazz: "Jazz",
  blues: "Blues",
  soul: "Soul",
  funk: "Funk",
  folk: "Folk",
  country: "Country",
  latin: "Latin",
  reggae: "Reggae",
  afrobeats: "Afrobeats",
  "live-band": "Live band",
  "open-mic": "Open mic",
  talk: "Talk / podcast",
  other: "Other",
};

/** Creator sub-type for streamers (role remains `dj` in DB — shared streaming tools). */
export const CREATOR_TYPES = ["dj", "musician", "band", "producer"] as const;
export type CreatorType = (typeof CREATOR_TYPES)[number];

export const creatorTypeLabels: Record<CreatorType, string> = {
  dj: "DJ",
  musician: "Musician",
  band: "Band",
  producer: "Producer",
};

export function getCreatorTypeLabel(type: string | null | undefined): string {
  if (type && type in creatorTypeLabels) return creatorTypeLabels[type as CreatorType];
  return "Creator";
}

export const tierColors: Record<string, string> = {
  bronze: "from-amber-700 to-amber-500",
  silver: "from-slate-400 to-slate-300",
  gold: "from-yellow-500 to-yellow-300",
  platinum: "from-purple-500 via-pink-500 to-cyan-400",
};

export const ACHIEVEMENTS = [
  { id: "first-set", name: "First Drop", description: "Stream your first live DJ set", icon: "🎧", tier: "bronze", rewardTokens: 50, requirement: "Stream 1 live set (15+ min)", category: "streaming", audience: "dj", metricKey: "streams_completed", threshold: 1 },
  { id: "hour-warrior", name: "Hour Warrior", description: "Stream for 1 hour straight", icon: "⏱️", tier: "bronze", rewardTokens: 100, requirement: "Stream 60 minutes", category: "streaming", audience: "dj", metricKey: "longest_stream_minutes", threshold: 60 },
  { id: "genre-explorer", name: "Genre Explorer", description: "Stream across 3 different genres", icon: "🎛️", tier: "silver", rewardTokens: 200, requirement: "3 genres streamed", category: "streaming", audience: "dj", metricKey: "genres_streamed", threshold: 3 },
  { id: "crowd-pleaser", name: "Crowd Pleaser", description: "Reach 100 concurrent viewers", icon: "👥", tier: "silver", rewardTokens: 250, requirement: "100 peak viewers", category: "milestones", audience: "dj", metricKey: "peak_viewers", threshold: 100 },
  { id: "tip-master", name: "Tip Master", description: "Receive 500 DROP in tips", icon: "💰", tier: "silver", rewardTokens: 300, requirement: "500 DROP tips received", category: "earnings", audience: "dj", metricKey: "total_tips_received", threshold: 500 },
  { id: "loyal-fans", name: "Loyal Fans", description: "Gain 1,000 followers", icon: "❤️", tier: "gold", rewardTokens: 500, requirement: "1,000 followers", category: "community", audience: "dj", metricKey: "followers", threshold: 1000 },
  { id: "marathon-dj", name: "Marathon DJ", description: "Stream for 4 hours in one session", icon: "🏃", tier: "gold", rewardTokens: 750, requirement: "4 hour stream", category: "streaming", audience: "dj", metricKey: "longest_stream_minutes", threshold: 240 },
  { id: "whale-magnet", name: "Whale Magnet", description: "Receive a single tip of 100+ DROP", icon: "🐋", tier: "gold", rewardTokens: 400, requirement: "100 DROP single tip", category: "earnings", audience: "dj", metricKey: "max_single_tip", threshold: 100 },
  { id: "legend-status", name: "Legend Status", description: "Reach 10,000 followers", icon: "👑", tier: "platinum", rewardTokens: 2000, requirement: "10,000 followers", category: "milestones", audience: "dj", metricKey: "followers", threshold: 10000 },
  { id: "crypto-king", name: "Crypto King", description: "Earn 10,000 DROP total", icon: "₿", tier: "platinum", rewardTokens: 5000, requirement: "10,000 DROP earned", category: "earnings", audience: "dj", metricKey: "total_earned", threshold: 10000 },
  { id: "first-tip", name: "First Tip", description: "Send your first tip", icon: "💎", tier: "bronze", rewardTokens: 10, requirement: "Tip any DJ once", category: "community", audience: "fan", metricKey: "tips_sent_count", threshold: 1 },
  { id: "generous-soul", name: "Generous Soul", description: "Tip 100 DROP total", icon: "🎁", tier: "silver", rewardTokens: 25, requirement: "100 DROP tipped total", category: "community", audience: "fan", metricKey: "tips_sent_total", threshold: 100 },
  { id: "superfan", name: "Superfan", description: "Tip 10 different DJs", icon: "🌟", tier: "silver", rewardTokens: 50, requirement: "Tip 10 unique DJs", category: "community", audience: "fan", metricKey: "unique_djs_tipped", threshold: 10 },
  { id: "night-owl", name: "Night Owl", description: "Watch 5 hours of live streams", icon: "🦉", tier: "silver", rewardTokens: 30, requirement: "300 min watch time", category: "streaming", audience: "fan", metricKey: "watch_minutes", threshold: 300 },
  { id: "track-hunter", name: "Track Hunter", description: "Unlock 20 track IDs", icon: "🔍", tier: "gold", rewardTokens: 75, requirement: "20 track unlocks", category: "milestones", audience: "fan", metricKey: "track_unlocks", threshold: 20 },
  { id: "request-king", name: "Request King", description: "10 accepted track requests", icon: "🎵", tier: "gold", rewardTokens: 100, requirement: "10 requests accepted", category: "milestones", audience: "fan", metricKey: "requests_accepted", threshold: 10 },
  { id: "vip-member", name: "VIP Member", description: "Subscribe to 3 DJs", icon: "⭐", tier: "gold", rewardTokens: 50, requirement: "3 active subs", category: "community", audience: "fan", metricKey: "active_subscriptions", threshold: 3 },
  { id: "og-listener", name: "OG Listener", description: "Account active 180 days", icon: "🏆", tier: "platinum", rewardTokens: 200, requirement: "180 days on platform", category: "milestones", audience: "fan", metricKey: "account_age_days", threshold: 180 },
] as const;
