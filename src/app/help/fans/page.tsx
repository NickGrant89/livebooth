import Link from "next/link";
import { HelpGuideLayout, GuideSection, GuideStep } from "@/components/HelpGuideLayout";
import { HelpQuickStart } from "@/components/HelpQuickStart";
import {
  DROP_TOKEN_SYMBOL,
  TRACK_UNLOCK_COST,
  REQUEST_COST,
  VIP_SUB_COST,
  MIN_STAKE_AMOUNT,
  DAILY_LOGIN_DROP,
  WELCOME_BONUS,
} from "@/lib/constants";

const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "watching", title: "Watching a stream" },
  { id: "drop", title: "Using DROP" },
  { id: "staking", title: "Staking & stations" },
  { id: "achievements", title: "Achievements & rankings" },
  { id: "profile", title: "Profile & settings" },
];

export default function FanGuidePage() {
  return (
    <HelpGuideLayout
      title="Fan guide"
      subtitle="Watch, tip, and collect — everything a listener needs on LiveBooth."
      backHref="/help"
      role="fan"
      sections={SECTIONS}
    >
      <HelpQuickStart role="fan" />
      <GuideSection id="getting-started" title="Getting started">
        <GuideStep n={1} title="Create your account">
          Sign up at <Link href="/signup" className="text-[#53fc18] hover:underline">/signup</Link> with the
          default <strong className="text-zinc-300">Fan</strong> role. Usernames are lowercase only — we auto-lowercase as you type.
          You start with <strong className="text-zinc-300">{WELCOME_BONUS} {DROP_TOKEN_SYMBOL}</strong> welcome bonus.
        </GuideStep>
        <GuideStep n={2} title="Discover live DJs">
          The <Link href="/" className="text-[#53fc18] hover:underline">home page</Link> shows who&apos;s live now,
          genre spotlights, and featured booths. Use search in the nav bar to find a DJ by name.
        </GuideStep>
        <GuideStep n={3} title="Follow for alerts">
          On any DJ profile or stream page, tap <strong className="text-zinc-300">Follow</strong>. You&apos;ll get
          in-app notifications when they go live. Enable{" "}
          <strong className="text-zinc-300">go-live push alerts</strong> in Settings or the bell menu for browser
          notifications.
        </GuideStep>
      </GuideSection>

      <GuideSection id="watching" title="Watching a stream">
        <GuideStep n={1} title="Join the booth">
          Open a live stream from Discover or a DJ profile (<code className="text-xs bg-white/10 px-1 rounded">/stream/username</code>).
          Click the player to unmute — browsers require a tap before audio plays.
        </GuideStep>
        <GuideStep n={2} title="Chat">
          Sign in to chat in the sidebar. Tips appear highlighted in chat. VIP subscribers get a badge and queue perks.
        </GuideStep>
        <GuideStep n={3} title="Now playing">
          When the DJ updates track info, it shows under the player. Use this to decide if you want to unlock the track ID.
        </GuideStep>
      </GuideSection>

      <GuideSection id="drop" title="Using DROP">
        <p className="text-sm text-zinc-400 mb-4">
          {DROP_TOKEN_SYMBOL} is LiveBooth&apos;s tip token. Most actions spend from your in-app wallet balance.
        </p>
        <GuideStep n={1} title="Wallet">
          Check balance at <Link href="/wallet" className="text-[#53fc18] hover:underline">/wallet</Link>.
          Buy {DROP_TOKEN_SYMBOL} packs via Stripe checkout. Connect VeWorld or sign in with email for an embedded wallet
          to send on-chain tips during live streams.
        </GuideStep>
        <GuideStep n={2} title="Daily login bonus">
          Claim <strong className="text-zinc-300">{DAILY_LOGIN_DROP} {DROP_TOKEN_SYMBOL}</strong> once per day from the
          banner at the top of the app when signed in.
        </GuideStep>
        <GuideStep n={3} title="Tip the DJ">
          On a live stream, choose a tip amount or enter a custom one. Toggle on-chain tips if your wallet is connected.
          Optional message appears in chat. Large tips can create VOD highlights.
        </GuideStep>
        <GuideStep n={4} title="Track ID unlock">
          Pay <strong className="text-zinc-300">{TRACK_UNLOCK_COST} {DROP_TOKEN_SYMBOL}</strong> to reveal the track
          the DJ is playing. Unlocks save to your{" "}
          <Link href="/crate" className="text-[#53fc18] hover:underline">crate</Link>.
        </GuideStep>
        <GuideStep n={5} title="Crowd request">
          Pay <strong className="text-zinc-300">{REQUEST_COST} {DROP_TOKEN_SYMBOL}</strong> to request a track.
          The DJ accepts or declines from their dashboard. VIP subs get 30% off requests and unlocks.
        </GuideStep>
        <GuideStep n={6} title="VIP subscription">
          Subscribe for <strong className="text-zinc-300">{VIP_SUB_COST} {DROP_TOKEN_SYMBOL}/month</strong> on a DJ&apos;s
          profile for discounted requests, track IDs, and chat perks.
        </GuideStep>
      </GuideSection>

      <GuideSection id="staking" title="Staking & stations">
        <GuideStep n={1} title="Stake on a DJ">
          On a DJ profile, use the stake panel (min {MIN_STAKE_AMOUNT} {DROP_TOKEN_SYMBOL}). Your {DROP_TOKEN_SYMBOL} backs that DJ —
          unstake anytime from the same panel.
        </GuideStep>
        <GuideStep n={2} title="Radio stations">
          Browse <Link href="/residencies" className="text-[#53fc18] hover:underline">radio stations</Link> to find branded channels.
          Follow a station, stake {DROP_TOKEN_SYMBOL} on it, and earn milestone rewards when the station hits follower and tip goals.
        </GuideStep>
      </GuideSection>

      <GuideSection id="achievements" title="Achievements & rankings">
        <GuideStep n={1} title="Fan achievements">
          Earn badges for tipping, watching, and unlocking tracks at{" "}
          <Link href="/achievements" className="text-[#53fc18] hover:underline">/achievements</Link>.
          Claim {DROP_TOKEN_SYMBOL} rewards when you unlock them.
        </GuideStep>
        <GuideStep n={2} title="Rankings">
          See top DJs, tippers, and stations on the{" "}
          <Link href="/leaderboard" className="text-[#53fc18] hover:underline">leaderboard</Link>.
        </GuideStep>
      </GuideSection>

      <GuideSection id="profile" title="Profile & settings">
        <GuideStep n={1} title="Settings">
          Update display name, avatar, and password at{" "}
          <Link href="/settings" className="text-[#53fc18] hover:underline">/settings</Link>.
        </GuideStep>
        <GuideStep n={2} title="Need help?">
          Use <Link href="/support" className="text-[#53fc18] hover:underline">live support chat</Link> on
          Support — chats are logged as tickets. Or email{" "}
          <a href="mailto:support@livebooth.uk" className="text-[#53fc18] hover:underline">support@livebooth.uk</a>.
        </GuideStep>
      </GuideSection>
    </HelpGuideLayout>
  );
}
