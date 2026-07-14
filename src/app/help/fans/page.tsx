import Link from "next/link";
import { HelpGuideLayout, GuideSection, GuideStep } from "@/components/HelpGuideLayout";
import { HelpQuickStart } from "@/components/HelpQuickStart";
import { HELP_LINKS } from "@/lib/help-links";
import {
  DROP_TOKEN_SYMBOL,
  TRACK_UNLOCK_COST,
  REQUEST_COST,
  MEMBER_TIER_PRICES,
  MEMBER_BILLING_DAYS,
  MEMBER_DJ_CREATOR_SHARE,
  MEMBER_STATION_OWNER_SHARE,
  MEMBER_STATION_LIVE_DJ_SHARE,
  MEMBER_PLATFORM_SHARE,
  DAILY_LOGIN_DROP,
  WELCOME_BONUS,
  MEMBER_PERKS_MEMBER,
  MEMBER_PERKS_SUPPORTER,
  STATION_MEMBER_PERKS_MEMBER,
  STATION_MEMBER_PERKS_SUPPORTER,
  STAKER_VOD_EARLY_HOURS,
  DJ_STAKER_VOD_EARLY_HOURS,
  STATION_MILESTONES,
  DJ_MILESTONES,
} from "@/lib/constants";

const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "watching", title: "Watching a stream" },
  { id: "drop", title: "Using DROP" },
  { id: "membership", title: "Membership" },
  { id: "replays", title: "Replays & VOD" },
  { id: "quests", title: "Quests & set grades" },
  { id: "achievements", title: "Achievements & rankings" },
  { id: "account", title: "Account & settings" },
];

export default function FanGuidePage() {
  return (
    <HelpGuideLayout
      title="Fan guide"
      subtitle="Watch, tip, join memberships for perks, and collect — everything a listener needs on LiveBooth."
      backHref={HELP_LINKS.hub}
      role="fan"
      sections={SECTIONS}
    >
      <HelpQuickStart role="fan" />
      <GuideSection id="getting-started" title="Getting started">
        <GuideStep n={1} title="Create your account">
          Sign up at <Link href="/signup" className="text-[#53fc18] hover:underline">/signup</Link> with the
          default <strong className="text-zinc-300">Fan</strong> role. Usernames are lowercase only — we auto-lowercase as you type.
          You start with <strong className="text-zinc-300">{WELCOME_BONUS} {DROP_TOKEN_SYMBOL}</strong> welcome bonus.
          In production you must verify your email before signing in — see{" "}
          <a href="#account" className="text-[#53fc18] hover:underline">Account &amp; settings</a>.
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
        <GuideStep n={2} title="Chat & member badges">
          Sign in to chat in the sidebar. Tips appear highlighted in chat. Active members get a{" "}
          <strong className="text-zinc-300">Member</strong> or <strong className="text-zinc-300">Supporter</strong> badge
          next to their messages on that DJ or station&apos;s streams.
        </GuideStep>
        <GuideStep n={3} title="Member perks on stream">
          During a live set, look for the <strong className="text-zinc-300">membership promo</strong> under the player —
          it links to the DJ or station membership panel. Members get cheaper unlocks and requests on that stream.
        </GuideStep>
        <GuideStep n={4} title="Now playing">
          When the DJ updates track info, it shows under the player. Use this to decide if you want to unlock the track ID.
        </GuideStep>
      </GuideSection>

      <GuideSection id="drop" title="Using DROP">
        <p className="text-sm text-zinc-400 mb-4">
          {DROP_TOKEN_SYMBOL} is LiveBooth&apos;s tip token. Most actions spend from your in-app wallet balance.
          See <Link href={HELP_LINKS.transparency} className="text-[#53fc18] hover:underline">transparency</Link> for fees and circulation.
        </p>
        <GuideStep n={1} title="Wallet">
          Check balance at <Link href={HELP_LINKS.wallet} className="text-[#53fc18] hover:underline">/wallet</Link>.
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
          Members get <strong className="text-zinc-300">10% off</strong> unlocks; Supporters get{" "}
          <strong className="text-zinc-300">20% off</strong> on eligible streams.
        </GuideStep>
        <GuideStep n={5} title="Crowd request">
          Pay <strong className="text-zinc-300">{REQUEST_COST} {DROP_TOKEN_SYMBOL}</strong> to request a track.
          The DJ accepts or declines from their dashboard. Members get <strong className="text-zinc-300">10% off</strong> requests;
          Supporters get <strong className="text-zinc-300">15% off</strong>.
        </GuideStep>
        <GuideStep n={6} title="Platform fees">
          Tips keep <strong className="text-zinc-300">90%</strong> for the DJ (10% platform). Unlocks and requests keep{" "}
          <strong className="text-zinc-300">85%</strong> for the DJ (15% platform). Membership is separate — see below.
        </GuideStep>
      </GuideSection>

      <GuideSection id="membership" title="Membership">
        <p className="text-sm text-zinc-400 mb-4">
          Monthly membership supports a DJ or station with recurring {DROP_TOKEN_SYMBOL} from your wallet.
          Choose <strong className="text-zinc-300">Member</strong> ({MEMBER_TIER_PRICES.member} {DROP_TOKEN_SYMBOL}/mo) or{" "}
          <strong className="text-zinc-300">Supporter</strong> ({MEMBER_TIER_PRICES.supporter} {DROP_TOKEN_SYMBOL}/mo).
          Billed every {MEMBER_BILLING_DAYS} days. Cancel anytime from the membership panel.
        </p>
        <GuideStep n={1} title="Back a DJ">
          On a DJ profile (<code className="text-xs bg-white/10 px-1 rounded">/dj/username#membership</code>) or from a live stream promo,
          use <strong className="text-zinc-300">Back this DJ</strong>.{" "}
          <strong className="text-zinc-300">{Math.round(MEMBER_DJ_CREATOR_SHARE * 100)}%</strong> of your fee goes to the DJ each month;
          the platform keeps <strong className="text-zinc-300">{Math.round(MEMBER_PLATFORM_SHARE * 100)}%</strong>.
        </GuideStep>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide ml-11 mb-1">Member tier</p>
        <ul className="ml-11 text-sm text-zinc-400 space-y-1 list-disc list-inside mb-3">
          {MEMBER_PERKS_MEMBER.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide ml-11 mb-1">Supporter tier</p>
        <ul className="ml-11 text-sm text-zinc-400 space-y-1 list-disc list-inside mb-4">
          {MEMBER_PERKS_SUPPORTER.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
        <GuideStep n={2} title="Become a station member">
          On a station page (<code className="text-xs bg-white/10 px-1 rounded">/station/slug#membership</code>),
          use <strong className="text-zinc-300">Become a member</strong>.{" "}
          <strong className="text-zinc-300">{Math.round(MEMBER_STATION_OWNER_SHARE * 100)}%</strong> goes to the station owner each month.
          When someone is live on air, <strong className="text-zinc-300">{Math.round(MEMBER_STATION_LIVE_DJ_SHARE * 100)}%</strong> goes to that DJ.
          Platform fee: <strong className="text-zinc-300">{Math.round(MEMBER_PLATFORM_SHARE * 100)}%</strong>.
        </GuideStep>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide ml-11 mb-1">Member tier</p>
        <ul className="ml-11 text-sm text-zinc-400 space-y-1 list-disc list-inside mb-3">
          {STATION_MEMBER_PERKS_MEMBER.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide ml-11 mb-1">Supporter tier</p>
        <ul className="ml-11 text-sm text-zinc-400 space-y-1 list-disc list-inside mb-4">
          {STATION_MEMBER_PERKS_SUPPORTER.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
        <GuideStep n={3} title="Community goals">
          Live DJ and station pages show a <strong className="text-zinc-300">community goal bar</strong> — collective monthly member
          revenue (MRR) toward unlockable perks like extended replay vaults for all members.
        </GuideStep>
        <GuideStep n={4} title="Milestone rewards">
          When a DJ or station hits growth goals, current members share a <strong className="text-zinc-300">DROP reward pool</strong> split
          proportionally by monthly tier (Supporter counts higher than Member). Progress bars show on each membership panel.
        </GuideStep>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400 space-y-3">
          <p className="font-semibold text-zinc-300">DJ milestone examples</p>
          <ul className="space-y-1">
            {DJ_MILESTONES.map((m) => (
              <li key={m.key}>
                {m.label} — <span className="text-cyan-300/80">{m.rewardPool} {DROP_TOKEN_SYMBOL} pool</span>
              </li>
            ))}
          </ul>
          <p className="font-semibold text-zinc-300 pt-2">Station milestone examples</p>
          <ul className="space-y-1">
            {STATION_MILESTONES.map((m) => (
              <li key={m.key}>
                {m.label} — <span className="text-cyan-300/80">{m.rewardPool} {DROP_TOKEN_SYMBOL} pool</span>
              </li>
            ))}
          </ul>
        </div>
        <GuideStep n={5} title="Find stations">
          Browse <Link href={HELP_LINKS.residencies} className="text-[#53fc18] hover:underline">radio stations</Link> for branded channels.
          Follow a station, become a member, and see top supporters on the station page.
        </GuideStep>
      </GuideSection>

      <GuideSection id="replays" title="Replays & VOD">
        <GuideStep n={1} title="Watch ended sets">
          After a stream ends, replays appear on the DJ profile archive and at{" "}
          <code className="text-xs bg-white/10 px-1 rounded">/vod/stream-id</code>.
        </GuideStep>
        <GuideStep n={2} title="Early replay access">
          Supporters get replay access before everyone else:
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Station members — first <strong className="text-zinc-300">{STAKER_VOD_EARLY_HOURS}h</strong> after a station show ends</li>
            <li>DJ members — first <strong className="text-zinc-300">{DJ_STAKER_VOD_EARLY_HOURS}h</strong> after that DJ&apos;s set ends</li>
          </ul>
          After the window, the replay is public. Join membership from the blocked replay screen or the post-set CTA on the VOD page.
        </GuideStep>
        <GuideStep n={3} title="Legendary moments">
          Large tips during a live set can create highlight markers — tap them on the VOD page to jump to that moment in the replay.
        </GuideStep>
      </GuideSection>

      <GuideSection id="quests" title="Quests & set grades">
        <GuideStep n={1} title="Daily quests">
          On the home page, check <strong className="text-zinc-300">Daily quests</strong> for small {DROP_TOKEN_SYMBOL} rewards
          (watch time, tips, follows, and more). Progress updates as you use the app.
        </GuideStep>
        <GuideStep n={2} title="Set grades">
          After a set ends, LiveBooth scores the stream (tips, engagement, unlocks, and more). During live station shows,
          member tips count <strong className="text-zinc-300">1.1×</strong> toward the grade. Grades appear on VOD replays and DJ profiles.
        </GuideStep>
        <GuideStep n={3} title="Rankings">
          See top DJs, tippers, and stations on the{" "}
          <Link href={HELP_LINKS.leaderboard} className="text-[#53fc18] hover:underline">leaderboard</Link>.
        </GuideStep>
      </GuideSection>

      <GuideSection id="achievements" title="Achievements & rankings">
        <GuideStep n={1} title="Fan achievements">
          Earn badges for tipping, watching, and unlocking tracks at{" "}
          <Link href={HELP_LINKS.achievements} className="text-[#53fc18] hover:underline">/achievements</Link>.
          Claim {DROP_TOKEN_SYMBOL} rewards when you unlock them.
        </GuideStep>
      </GuideSection>

      <GuideSection id="account" title="Account & settings">
        <GuideStep n={1} title="Email verification">
          After signup you receive a verification email. Click the link (valid 24 hours) before signing in.
          Didn&apos;t get it? Check spam, then use{" "}
          <Link href={HELP_LINKS.verifyEmail} className="text-[#53fc18] hover:underline">/verify-email</Link> to resend.
          More tips in <Link href={`${HELP_LINKS.support}#faq`} className="text-[#53fc18] hover:underline">Support FAQ</Link>.
        </GuideStep>
        <GuideStep n={2} title="Password reset">
          Use <Link href={HELP_LINKS.forgotPassword} className="text-[#53fc18] hover:underline">/forgot-password</Link> if you
          can&apos;t sign in. Signed-in users can change password in Settings.
        </GuideStep>
        <GuideStep n={3} title="Settings">
          Update display name, avatar, and notifications at{" "}
          <Link href="/settings" className="text-[#53fc18] hover:underline">/settings</Link>.
        </GuideStep>
        <GuideStep n={4} title="Need help?">
          <Link href={HELP_LINKS.support} className="text-[#53fc18] hover:underline">Live support chat</Link> is fastest —
          every chat is logged as a ticket. Or email{" "}
          <a href="mailto:support@livebooth.uk" className="text-[#53fc18] hover:underline">support@livebooth.uk</a>.
        </GuideStep>
      </GuideSection>
    </HelpGuideLayout>
  );
}
