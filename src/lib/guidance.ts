import {
  DROP_TOKEN_SYMBOL,
  TRACK_UNLOCK_COST,
  REQUEST_COST,
  DAILY_LOGIN_DROP,
  MIN_STAKE_AMOUNT,
} from "./constants";
import { HELP_LINKS } from "./help-links";

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
  {
    title: "Stake for perks",
    body: `Back a DJ or become a station member (min ${MIN_STAKE_AMOUNT} ${DROP_TOKEN_SYMBOL}) for badges, cheaper unlocks, early replays, and milestone rewards.`,
    href: `${HELP_LINKS.fans}#staking`,
    hrefLabel: "Staking guide",
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
    body: "Go Live → title & genre → copy RTMP server + stream key → Start Streaming in OBS → preview → go live.",
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
    body: "Green bitrate in OBS (e.g. 2500 kbps). If preview stays on 'Waiting for OBS', Stop Streaming, re-paste your stream key from Go Live, then Start Streaming again.",
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
  {
    title: "Grow supporters",
    body: "Fans who back you get early replays and milestone rewards — point them to your profile #stake section.",
    href: `${HELP_LINKS.djs}#supporters`,
    hrefLabel: "Supporter guide",
  },
];

export const DJ_OBS_STEPS = [
  "Open OBS → Settings → Stream → Service: Custom",
  "Server: rtmp://rtmp.livebooth.uk:1935/live",
  "Stream key: paste from Go Live (key field only — not in the server URL)",
  "Mac (M1/M2/M3): Settings → Output → Encoder = Apple VT H264 Hardware Encoder (not x264)",
  "Settings → Output → keyframe interval = 2 seconds (not 0/auto)",
  "Add a video source (Display Capture or webcam) — image-only scenes can fail ingest",
  "Click Start Streaming — confirm bitrate shows in the OBS status bar (not just Connected)",
  "Return to Go Live — wait for Signal detected, then click Looks good — go live",
];

/** Shown when OBS connects then drops every ~3 seconds (WriteN RTMP send error 32). */
export const DJ_OBS_DISCONNECT_LOOP_TIPS = [
  "Stop Streaming in OBS first — the reconnect loop makes debugging harder",
  "Generate a new stream key on Go Live and paste it into OBS (Stream key field only)",
  "Encoder: Apple VT H264 Hardware Encoder (Mac) or NVENC (Windows) — avoid software x264 on older OBS",
  "Keyframe interval: 2 sec · Profile: main or high · Resolution: 1280×720 @ 30 fps",
  "Remove broken sources (red missing files in OBS) and add Display Capture or a webcam",
  "Upgrade OBS if below v30 — v26 often disconnects from modern RTMP servers",
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
  "Buy more DROP from Wallet via Stripe checkout, or claim your daily login bonus on the home page.",
  "Connect a wallet at /wallet for on-chain tips during live streams.",
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
    href: `${HELP_LINKS.stations}#embed`,
    hrefLabel: "Embed guide",
  },
];

export function getGuidePath(role: string) {
  if (role === "station") return HELP_LINKS.stations;
  if (role === "dj" || role === "admin") return HELP_LINKS.djs;
  return HELP_LINKS.fans;
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
