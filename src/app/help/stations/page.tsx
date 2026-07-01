import Link from "next/link";
import { HelpGuideLayout, GuideSection, GuideStep } from "@/components/HelpGuideLayout";
import { HelpQuickStart } from "@/components/HelpQuickStart";
import { STATION_TIP_DJ_SHARE, STATION_TIP_STATION_SHARE } from "@/lib/constants";

const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "residents", title: "Residents & lineup" },
  { id: "embed", title: "Embed & relay" },
  { id: "staking", title: "Staking milestones" },
  { id: "support", title: "Support" },
];

export default function StationGuidePage() {
  return (
    <HelpGuideLayout
      title="Station guide"
      subtitle="Run a branded radio channel on LiveBooth."
      backHref="/help"
      role="station"
      sections={SECTIONS}
    >
      <HelpQuickStart role="station" />
      <GuideSection id="getting-started" title="Getting started">
        <GuideStep n={1} title="Create a station account">
          Sign up at <Link href="/signup" className="text-[#53fc18] hover:underline">/signup</Link> and
          choose the <strong className="text-zinc-300">Radio</strong> role. After sign-in you&apos;ll land on{" "}
          <Link href="/settings" className="text-[#53fc18] hover:underline">Settings</Link> with a
          short setup wizard — pick your station name and public URL (e.g.{" "}
          <code className="text-xs bg-white/10 px-1 rounded">/station/your-slug</code>).
        </GuideStep>
        <GuideStep n={2} title="Already have an account?">
          An admin can set your role to <strong className="text-zinc-300">station</strong> in{" "}
          <Link href="/admin" className="text-[#53fc18] hover:underline">/admin</Link> → Users.
          Then open Settings — the same setup wizard appears automatically.
        </GuideStep>
        <GuideStep n={3} title="Owner dashboard">
          In <Link href="/settings" className="text-[#53fc18] hover:underline">Settings</Link>: manage residents,
          import lineup CSV, set relay URL, configure embed player, and track staking milestones.
        </GuideStep>
        <GuideStep n={4} title="Tip splits">
          When a resident DJ streams under your station, tips split{" "}
          {Math.round(STATION_TIP_DJ_SHARE * 100)}% DJ / {Math.round(STATION_TIP_STATION_SHARE * 100)}% station / 10% platform.
        </GuideStep>
      </GuideSection>

      <GuideSection id="residents" title="Residents & lineup">
        <GuideStep n={1} title="Add resident DJs">
          Settings → Station dashboard → add DJs by username. They must already have DJ accounts on LiveBooth.
        </GuideStep>
        <GuideStep n={2} title="CSV import">
          Import a weekly lineup CSV to schedule resident slots. Fans see upcoming shows on your station page.
        </GuideStep>
        <GuideStep n={3} title="When residents go live">
          Streams show &quot;Presented by [Your Station]&quot; and appear on your channel&apos;s live feed.
        </GuideStep>
      </GuideSection>

      <GuideSection id="embed" title="Embed & relay">
        <GuideStep n={1} title="Embed on your website">
          Pro+ tiers get an iframe player at <code className="text-xs bg-white/10 px-1 rounded">/embed/station/slug</code>.
          Copy the snippet from your station dashboard in Settings.
        </GuideStep>
        <GuideStep n={2} title="FM / relay simulcast">
          Set a relay URL in Settings to simulcast your LiveBooth feed to external radio infrastructure.
        </GuideStep>
      </GuideSection>

      <GuideSection id="staking" title="Staking milestones">
        <GuideStep n={1} title="Station staking">
          Fans can stake DROP on your station to show support. Milestone rewards unlock when you hit follower and tip goals.
        </GuideStep>
        <GuideStep n={2} title="Promote your channel">
          Share <code className="text-xs bg-white/10 px-1 rounded">/station/your-slug</code> on socials and your website embed.
        </GuideStep>
      </GuideSection>

      <GuideSection id="support" title="Support">
        <GuideStep n={1} title="Get help">
          Station setup, embed issues, or billing — see{" "}
          <Link href="/support" className="text-[#53fc18] hover:underline">support &amp; FAQ</Link> or email{" "}
          <a href="mailto:support@livebooth.local" className="text-[#53fc18] hover:underline">support@livebooth.local</a>.
        </GuideStep>
      </GuideSection>
    </HelpGuideLayout>
  );
}
