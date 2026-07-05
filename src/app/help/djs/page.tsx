import Link from "next/link";
import { HelpGuideLayout, GuideSection, GuideStep } from "@/components/HelpGuideLayout";
import { HelpQuickStart } from "@/components/HelpQuickStart";
import { DROP_TOKEN_SYMBOL, STATION_TIP_DJ_SHARE, STATION_TIP_STATION_SHARE } from "@/lib/constants";

const RTMP_SERVER = "rtmp://rtmp.livebooth.uk:1935/live";

const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "going-live", title: "Going live" },
  { id: "obs", title: "OBS setup" },
  { id: "earning", title: "Earning DROP" },
  { id: "collab", title: "Collab & B2B" },
  { id: "growth", title: "Growth tips" },
  { id: "support", title: "Support" },
];

export default function DjGuidePage() {
  return (
    <HelpGuideLayout
      title="DJ guide"
      subtitle="Stream from the booth, preview your feed, earn DROP, and grow your audience."
      backHref="/help"
      role="dj"
      sections={SECTIONS}
    >
      <HelpQuickStart role="dj" />
      <GuideSection id="getting-started" title="Getting started">
        <GuideStep n={1} title="Sign up as a DJ">
          Choose the <strong className="text-zinc-300">DJ</strong> role at{" "}
          <Link href="/signup" className="text-[#53fc18] hover:underline">/signup</Link>.
          Usernames are lowercase — we save what you type in lowercase. Complete your profile (display name, bio,
          avatar, genres) in <Link href="/settings" className="text-[#53fc18] hover:underline">Settings</Link>.
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
          then confirm. You&apos;ll get an RTMP server URL and a unique stream key for OBS.
        </GuideStep>
        <GuideStep n={2} title="Preview before you publish">
          After your stream key is created, Go Live shows a <strong className="text-zinc-300">preview step</strong>.
          Fans are <em>not</em> notified until you click &quot;Looks good — go live&quot;. Use preview to check video
          and audio. If you cancel setup, nothing is published and the session is discarded.
        </GuideStep>
        <GuideStep n={3} title="During your set">
          Use the <Link href="/dashboard" className="text-[#53fc18] hover:underline">dashboard</Link> to update now
          playing, accept or decline crowd requests, see session goals, top tippers, and live stats.
        </GuideStep>
        <GuideStep n={4} title="End stream">
          End from the dashboard or Go Live page. Replays appear in your profile archive after the stream ends.
        </GuideStep>
      </GuideSection>

      <GuideSection id="obs" title="OBS setup">
        <GuideStep n={1} title="Stream settings">
          <ul className="list-disc list-inside text-sm text-zinc-400 mt-2 space-y-1">
            <li>OBS → Settings → Stream → Service: <strong className="text-zinc-300">Custom</strong></li>
            <li>
              Server: <code className="bg-white/10 px-1 rounded">{RTMP_SERVER}</code>
            </li>
            <li>Stream key: copy from Go Live — paste in the <strong className="text-zinc-300">Stream key</strong> field only</li>
            <li>Never put the stream key in the server URL</li>
          </ul>
        </GuideStep>
        <GuideStep n={2} title="Start streaming">
          Click <strong className="text-zinc-300">Start Streaming</strong> in OBS (not Preview or Virtual Cam alone).
          The OBS status bar should show a <strong className="text-zinc-300">bitrate number</strong> (e.g. 2500 kbps),
          not just &quot;Connected&quot;. Go Live detects your feed automatically when the HLS manifest is ready.
        </GuideStep>
        <GuideStep n={3} title="New session or new key?">
          Each Go Live session generates a new stream key. If you start a new session or cancel and restart, click{" "}
          <strong className="text-zinc-300">Stop Streaming</strong> in OBS, paste the new key, then{" "}
          <strong className="text-zinc-300">Start Streaming</strong> again.
        </GuideStep>
        <GuideStep n={4} title="Preview not showing video?">
          See <Link href="/support" className="text-[#53fc18] hover:underline">Support → Stream troubleshooting</Link>{" "}
          for step-by-step checks. The preview page shows diagnostics when OBS looks connected but the server
          can&apos;t see your feed.
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
          Claim {DROP_TOKEN_SYMBOL} rewards in-app; on-chain claims are available when your wallet is connected.
        </GuideStep>
        <GuideStep n={5} title="Wallet & on-chain tips">
          View earnings at <Link href="/wallet" className="text-[#53fc18] hover:underline">/wallet</Link>.
          Connect VeWorld or create an embedded wallet (email login) to receive on-chain tips during live sets.
          Link your wallet address on your DJ profile so fans can tip on-chain.
        </GuideStep>
        <GuideStep n={6} title="Cash-out">
          Request fiat cash-out from the wallet page when available. Admin-approved payouts are processed manually.
        </GuideStep>
      </GuideSection>

      <GuideSection id="collab" title="Collab & B2B">
        <GuideStep n={1} title="Collab mode">
          Invite another DJ from <Link href="/collab" className="text-[#53fc18] hover:underline">/collab</Link>.
          When both feeds are live, LiveBooth mixes host + partner into one synced stream (DJ + MC audio and video).
          Tips split between host and partner per your agreed ratio.
        </GuideStep>
        <GuideStep n={2} title="How to run a B2B set">
          Host goes live first and sends a collab invite. Partner accepts, streams from their location, and publishes.
          When both OBS feeds are connected, the server compositor builds one booth — fans watch the host page only.
          Both DJs should enable audio in OBS (mic or stream audio) for the mix.
        </GuideStep>
        <GuideStep n={3} title="Station residencies">
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
          <li>Use the share button on Go Live and your stream page to spread your booth link</li>
        </ul>
      </GuideSection>

      <GuideSection id="support" title="Support">
        <GuideStep n={1} title="Get help">
          Stream issues, payouts, or account problems — see{" "}
          <Link href="/support" className="text-[#53fc18] hover:underline">Support &amp; FAQ</Link>,{" "}
          <Link href="/policies" className="text-[#53fc18] hover:underline">Policies &amp; procedures</Link>, or email{" "}
          <a href="mailto:support@livebooth.uk" className="text-[#53fc18] hover:underline">support@livebooth.uk</a>.
        </GuideStep>
      </GuideSection>
    </HelpGuideLayout>
  );
}
