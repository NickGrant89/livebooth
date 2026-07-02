import {
  DROP_TOKEN_SYMBOL,
  TRACK_UNLOCK_COST,
  REQUEST_COST,
  DAILY_LOGIN_DROP,
} from "./constants";

export type GuidanceRole = "fan" | "dj" | "station";

export interface GuidanceStep {
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
}

export const FAN_QUICK_START: GuidanceStep[] = [
  {
    title: "Pick a live booth",
    body: "Browse Discover or search a DJ. Tap a stream — click the player to unmute audio.",
    href: "/",
    hrefLabel: "Discover",
  },
  {
    title: "Follow for go-live alerts",
    body: "Follow DJs you like. Enable push alerts in Settings or the bell menu so you never miss a set.",
    href: "/settings",
    hrefLabel: "Settings",
  },
  {
    title: "Tip the drop",
    body: `Send DROP during a set — tips show in chat. Claim ${DAILY_LOGIN_DROP} free ${DROP_TOKEN_SYMBOL} daily from the banner at the top.`,
    href: "/wallet",
    hrefLabel: "Wallet",
  },
  {
    title: "Unlock track IDs",
    body: `Pay ${TRACK_UNLOCK_COST} ${DROP_TOKEN_SYMBOL} to reveal what's playing. Saved tracks go to your crate.`,
    href: "/crate",
    hrefLabel: "Your crate",
  },
];

export const FAN_STREAM_TIPS: GuidanceStep[] = [
  {
    title: "Unmute the player",
    body: "Browsers block autoplay sound — tap the video once to hear the set.",
  },
  {
    title: "Tip or unlock",
    body: `Use the tip button in chat, or unlock the track ID for ${TRACK_UNLOCK_COST} ${DROP_TOKEN_SYMBOL}.`,
  },
  {
    title: "Request a track",
    body: `VIP subs get 30% off. Crowd requests cost ${REQUEST_COST} ${DROP_TOKEN_SYMBOL} — the DJ can accept or decline.`,
  },
  {
    title: "Something wrong?",
    body: "Use Report stream in the sidebar if content breaks community rules.",
  },
];

export const DJ_QUICK_START: GuidanceStep[] = [
  {
    title: "Complete your profile",
    body: "Add display name, bio, genres, and avatar so fans find you on Discover.",
    href: "/settings",
    hrefLabel: "Edit profile",
  },
  {
    title: "Set your weekly slot",
    body: "Fans see when you're expected to stream even when you're offline.",
    href: "/settings",
    hrefLabel: "Set schedule",
  },
  {
    title: "Go live with OBS",
    body: "Go Live → enter title & genre → copy RTMP URL + stream key into OBS → Start Streaming.",
    href: "/go-live",
    hrefLabel: "Go Live wizard",
  },
  {
    title: "Run the booth while live",
    body: "Dashboard: update Now Playing (track IDs), accept crowd requests, watch session goals.",
    href: "/dashboard",
    hrefLabel: "Dashboard",
  },
];

export const DJ_LIVE_CHECKLIST: GuidanceStep[] = [
  {
    title: "OBS is streaming",
    body: "Green bitrate in OBS. If fans see a demo loop, your encoder isn't connected — check server URL and stream key.",
  },
  {
    title: "Update Now Playing",
    body: "Each track you set lets fans unlock the ID for DROP — more engagement, more tips.",
  },
  {
    title: "Respond to chat & requests",
    body: "Thank tippers by name. Accept or decline paid crowd requests from the dashboard queue.",
  },
  {
    title: "Share your booth link",
    body: "Send fans to /stream/yourusername — followers get notified when you go live next time.",
  },
];

export const DJ_OBS_STEPS = [
  "Open OBS → Settings → Stream",
  "Service: Custom",
  "Server: paste RTMP URL from LiveBooth (after you start the stream)",
  "Stream key: paste your unique key — keep it secret",
  "Click Start Streaming in OBS, then open Dashboard to manage the booth",
];

export const GO_LIVE_STEPS = [
  { label: "Details", hint: "Title & genre help fans discover your set" },
  { label: "OBS setup", hint: "How to connect your encoder" },
  { label: "Stream key", hint: "Creates your private RTMP credentials" },
  { label: "Preview", hint: "Check video & audio before fans see you" },
  { label: "Live", hint: "Share your booth & open dashboard" },
];

export const FAN_WALLET_TIPS = [
  `Your balance is in ${DROP_TOKEN_SYMBOL} — the booth currency for tips, unlocks, and requests.`,
  "Buy more DROP from Wallet (Stripe test mode) or claim daily login bonus on the home page.",
  "Track unlocks and tips appear in your transaction history.",
];

export const STATION_QUICK_START: GuidanceStep[] = [
  {
    title: "Set up your channel",
    body: "Settings → Station dashboard: name, relay URL, residents, embed code.",
    href: "/settings",
    hrefLabel: "Station dashboard",
  },
  {
    title: "Book resident DJs",
    body: "Add DJs by username or import a CSV schedule for your weekly lineup.",
  },
  {
    title: "Embed on your site",
    body: "Pro+ tiers get a white-label iframe player — copy from your station dashboard.",
  },
];

export function getGuidePath(role: string) {
  if (role === "station") return "/help/stations";
  if (role === "dj" || role === "admin") return "/help/djs";
  return "/help/fans";
}

export function getQuickStart(role: string): GuidanceStep[] {
  if (role === "station") return STATION_QUICK_START;
  if (role === "dj" || role === "admin") return DJ_QUICK_START;
  return FAN_QUICK_START;
}

export function getDismissKey(role: string) {
  if (role === "station") return "lb_dismiss_guide_station";
  if (role === "dj" || role === "admin") return "lb_dismiss_guide_dj";
  return "lb_dismiss_guide_fan";
}
