/** Central help & docs URLs — use these in nav, guides, and CTAs to avoid drift. */

export const HELP_LINKS = {
  hub: "/help",
  guide: "/guide",
  fans: "/help/fans",
  djs: "/help/djs",
  stations: "/help/stations",
  support: "/support",
  policies: "/policies",
  roadmap: "/roadmap",
  transparency: "/transparency",
  wallet: "/wallet",
  forgotPassword: "/forgot-password",
  verifyEmail: "/verify-email",
  residencies: "/residencies",
  achievements: "/achievements",
  leaderboard: "/leaderboard",
} as const;

export const HELP_TOPICS = [
  {
    href: `${HELP_LINKS.fans}#membership`,
    title: "Membership",
    description: "DJ supporters and station members — tiers, perks, revenue splits, milestones, early replays.",
    anchor: "membership",
  },
  {
    href: `${HELP_LINKS.fans}#replays`,
    title: "Replays & VOD",
    description: "Watch ended sets, legendary moments, and member-only early replay windows.",
    anchor: "replays",
  },
  {
    href: `${HELP_LINKS.fans}#account`,
    title: "Account & email",
    description: "Sign up, verify your email, reset password, and notification settings.",
    anchor: "account",
  },
  {
    href: HELP_LINKS.wallet,
    title: "Wallet & DROP",
    description: "Balance, Stripe packs, daily bonus, on-chain tips, and cash-out.",
    anchor: null,
  },
  {
    href: HELP_LINKS.transparency,
    title: "Transparency",
    description: "DROP circulation, platform fees, and on-chain treasury addresses.",
    anchor: null,
  },
] as const;

export function roleGuidePath(role: string): string {
  if (role === "station") return HELP_LINKS.stations;
  if (role === "dj" || role === "admin") return HELP_LINKS.djs;
  return HELP_LINKS.fans;
}
