import Link from "next/link";
import { HelpGuideLayout, GuideSection, GuideStep } from "@/components/HelpGuideLayout";
import { HelpQuickStart } from "@/components/HelpQuickStart";
import { DROP_TOKEN_SYMBOL, STATION_TIP_DJ_SHARE, STATION_TIP_STATION_SHARE } from "@/lib/constants";

const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "going-live", title: "Going live" },
  { id: "earning", title: "Earning DROP" },
  { id: "collab", title: "Collab & B2B" },
  { id: "growth", title: "Growth tips" },
  { id: "support", title: "Support" },
];

export default function DjGuidePage() {
  return (
    <HelpGuideLayout
      title="DJ guide"
      subtitle="Stream from the booth, earn DROP, and grow your audience."
      backHref="/help"
      role="dj"
      sections={SECTIONS}
    >
      <HelpQuickStart role="dj" />
      <GuideSection id="getting-started" title="Getting started">
        <GuideStep n={1} title="Sign up as a DJ">
          Choose the <strong className="text-zinc-300">DJ</strong> role at{" "}
          <Link href="/signup" className="text-[#53fc18] hover:underline">/signup</Link>.
          Usernames must be lowercase — type <code className="text-xs bg-white/10 px-1 rounded">Digital89</code> and
          we save it as <code className="text-xs bg-white/10 px-1 rounded">digital89</code>.
          Complete your profile — display name, bio, avatar, and genres — in{" "}
          <Link href="/settings" className="text-[#53fc18] hover:underline">Settings</Link>.
        </GuideStep>
        <GuideStep n={2} title="Your public profile">
          Fans find you at <code className="text-xs bg-white/10 px-1 rounded">/dj/yourusername</code>.
          Share this link on socials. Followers get notified when you go live.
        </GuideStep>
        <GuideStep n={3} title="Weekly schedule">
          In Settings, set your <strong className="text-zinc-300">weekly stream slot</strong> (day + hour UTC).
          Fans see when you&apos;re expected even when you&apos;re offline.
        </GuideStep>
      </GuideSection>

      <GuideSection id="going-live" title="Going live">
        <GuideStep n={1} title="Start a session">
          Open <Link href="/go-live" className="text-[#53fc18] hover:underline">Go Live</Link>, enter title and genre,
          then confirm. You&apos;ll get an RTMP URL and stream key for OBS (or your encoder).
        </GuideStep>
        <GuideStep n={2} title="OBS setup">
          <ul className="list-disc list-inside text-sm text-zinc-400 mt-2 space-y-1">
            <li>Settings → Stream → Custom service</li>
            <li>Server: the RTMP URL shown in your dashboard</li>
            <li>Stream key: copy from dashboard (keep it secret)</li>
            <li>Start streaming in OBS, then fans see your HLS feed in the booth</li>
          </ul>
          <p className="text-xs text-zinc-600 mt-2">
            Without a Livepeer key, local dev uses a demo HLS stream until OBS is connected via{" "}
            <code className="bg-white/10 px-1 rounded">npm run rtmp:start</code>.
          </p>
        </GuideStep>
        <GuideStep n={3} title="During your set">
          Use the <Link href="/dashboard" className="text-[#53fc18] hover:underline">dashboard</Link> to:
          update now playing, accept/decline crowd requests, see session goals, top tippers, and live stats.
        </GuideStep>
        <GuideStep n={4} title="End stream">
          End from the dashboard or Go Live page. You&apos;ll get a session recap with tips, viewers, and highlights.
        </GuideStep>
      </GuideSection>

      <GuideSection id="earning" title="Earning DROP">
        <GuideStep n={1} title="Tips">
          Fans tip from the stream page. Default split: <strong className="text-zinc-300">90% you / 10% platform</strong>.
          Tips show in chat and count toward achievements.
        </GuideStep>
        <GuideStep n={2} title="Track unlocks & requests">
          You earn when fans unlock track IDs or when you accept paid crowd requests (after platform fee).
        </GuideStep>
        <GuideStep n={3} title="VIP subscribers">
          Fans can subscribe monthly for perks. Subscription DROP is credited to your balance each billing cycle.
        </GuideStep>
        <GuideStep n={4} title="Achievements">
          Unlock DJ achievements for streaming milestones, tips, and followers at{" "}
          <Link href="/achievements" className="text-[#53fc18] hover:underline">/achievements</Link>.
          Claim {DROP_TOKEN_SYMBOL} rewards — on-chain claim when contracts are deployed.
        </GuideStep>
        <GuideStep n={5} title="Wallet, on-chain & cash-out">
          View earnings at <Link href="/wallet" className="text-[#53fc18] hover:underline">/wallet</Link>.
          Connect VeWorld for on-chain tips (VeChain testnet — see docs/VECHAIN-TESTNET.md).
          Request fiat cash-out from the wallet page; admin approves in <Link href="/admin" className="text-[#53fc18] hover:underline">/admin</Link> → Treasury.
        </GuideStep>
      </GuideSection>

      <GuideSection id="collab" title="Collab & B2B">
        <GuideStep n={1} title="Collab mode">
          Invite another DJ from <Link href="/collab" className="text-[#53fc18] hover:underline">/collab</Link>.
          When active on a stream, tips split between host and partner per your agreed ratio.
        </GuideStep>
        <GuideStep n={2} title="Station residencies">
          Radio stations can add you as a resident. Your shows appear on their channel and tips may split{" "}
          {Math.round(STATION_TIP_DJ_SHARE * 100)}% DJ / {Math.round(STATION_TIP_STATION_SHARE * 100)}% station / 10% platform.
          When you go live as a resident, the stream shows &quot;Presented by [Station]&quot;.
          See the <Link href="/help/stations" className="text-[#53fc18] hover:underline">station guide</Link> for owners.
        </GuideStep>
      </GuideSection>

      <GuideSection id="growth" title="Growth tips">
        <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
          <li>Go live on a consistent weekly slot so fans know when to tune in</li>
          <li>Update now playing often — track ID unlocks drive engagement</li>
          <li>Thank tippers in chat; first-tip bonuses encourage early support</li>
          <li>Check the <Link href="/leaderboard" className="text-[#53fc18] hover:underline">rankings</Link> for competition context</li>
          <li>Enable push so followers get notified every time you&apos;re live</li>
        </ul>
      </GuideSection>

      <GuideSection id="support" title="Support">
        <GuideStep n={1} title="Get help">
          Stream issues, payouts, or account problems — see{" "}
          <Link href="/support" className="text-[#53fc18] hover:underline">support &amp; FAQ</Link> or email{" "}
          <a href="mailto:support@livebooth.local" className="text-[#53fc18] hover:underline">support@livebooth.local</a>.
        </GuideStep>
      </GuideSection>
    </HelpGuideLayout>
  );
}
