import Link from "next/link";
import { HelpGuideLayout, GuideSection, GuideStep } from "@/components/HelpGuideLayout";
import { HelpQuickStart } from "@/components/HelpQuickStart";
import { HELP_LINKS } from "@/lib/help-links";
import {
  STATION_TIP_DJ_SHARE,
  STATION_TIP_STATION_SHARE,
  STATION_MILESTONES,
  RADIO_TIERS,
  STATION_MEMBER_PERKS_MEMBER,
  MEMBER_TIER_PRICES,
  MEMBER_STATION_OWNER_SHARE,
  MEMBER_STATION_LIVE_DJ_SHARE,
  MEMBER_PLATFORM_SHARE,
  DROP_TOKEN_SYMBOL,
} from "@/lib/constants";

const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "tiers", title: "Station tiers" },
  { id: "residents", title: "Residents & lineup" },
  { id: "embed", title: "Embed & relay" },
  { id: "membership", title: "Members & milestones" },
  { id: "support", title: "Support" },
];

export default function StationGuidePage() {
  return (
    <HelpGuideLayout
      title="Station guide"
      subtitle="Run a branded radio channel on LiveBooth."
      backHref={HELP_LINKS.hub}
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
          import lineup CSV, set relay URL, configure embed player, and track member milestones.
        </GuideStep>
        <GuideStep n={4} title="Tip splits">
          When a resident DJ streams under your station, tips split{" "}
          {Math.round(STATION_TIP_DJ_SHARE * 100)}% DJ / {Math.round(STATION_TIP_STATION_SHARE * 100)}% station / 10% platform.
        </GuideStep>
      </GuideSection>

      <GuideSection id="tiers" title="Station tiers">
        <p className="text-sm text-zinc-400 mb-4">
          LiveBooth offers three program tiers. Your tier controls resident limits, relay, embed, and dashboard features.
        </p>
        <div className="space-y-3">
          {(Object.keys(RADIO_TIERS) as Array<keyof typeof RADIO_TIERS>).map((key) => {
            const tier = RADIO_TIERS[key];
            return (
              <div key={key} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
                <p className="font-semibold text-zinc-200">{tier.label}</p>
                <p className="text-zinc-500 text-xs mt-1">{tier.description}</p>
                <ul className="text-zinc-400 text-xs mt-2 space-y-0.5">
                  <li>Up to {tier.maxResidents} resident DJs</li>
                  <li>{tier.relayMode ? "Relay / simulcast supported" : "No relay mode"}</li>
                  <li>{tier.whiteLabel ? "White-label embed" : tier.stationDashboard ? "Station dashboard" : "Basic hub"}</li>
                </ul>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500 mt-3">
          Need a tier change? Contact <Link href={HELP_LINKS.support} className="text-[#53fc18] hover:underline">support</Link> or
          use the upgrade flow in your station dashboard when available.
        </p>
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
          Fans can become <strong className="text-zinc-300">station members</strong> for perks on all station shows.
        </GuideStep>
      </GuideSection>

      <GuideSection id="embed" title="Embed & relay">
        <GuideStep n={1} title="Station video channel">
          Settings → Station dashboard → <strong className="text-zinc-300">Station video channel</strong>.
          Get an RTMP key, preview in OBS, then go live on{" "}
          <code className="text-xs bg-white/10 px-1 rounded">/station/your-slug/live</code>.
          Separate from resident DJ Go Live — use this for studio cams and branded station feeds.
        </GuideStep>
        <GuideStep n={2} title="Embed on your website">
          Pro+ tiers get an iframe player at <code className="text-xs bg-white/10 px-1 rounded">/embed/station/slug</code>.
          Copy the snippet from your station dashboard in Settings. See{" "}
          <Link href={`${HELP_LINKS.support}#faq`} className="text-[#53fc18] hover:underline">Support FAQ</Link> if the embed doesn&apos;t load.
        </GuideStep>
        <GuideStep n={3} title="FM / relay simulcast">
          Set a relay URL in Settings to simulcast your LiveBooth feed to external radio infrastructure.
        </GuideStep>
      </GuideSection>

      <GuideSection id="membership" title="Members & milestones">
        <GuideStep n={1} title="Station membership">
          Fans join at <strong className="text-zinc-300">Member</strong> ({MEMBER_TIER_PRICES.member} {DROP_TOKEN_SYMBOL}/mo) or{" "}
          <strong className="text-zinc-300">Supporter</strong> ({MEMBER_TIER_PRICES.supporter} {DROP_TOKEN_SYMBOL}/mo) on your station page (
          <code className="text-xs bg-white/10 px-1 rounded">/station/slug#membership</code>).
          You receive <strong className="text-zinc-300">{Math.round(MEMBER_STATION_OWNER_SHARE * 100)}%</strong> each billing cycle.
          When a resident is live, <strong className="text-zinc-300">{Math.round(MEMBER_STATION_LIVE_DJ_SHARE * 100)}%</strong> goes to that DJ.
          Platform fee: <strong className="text-zinc-300">{Math.round(MEMBER_PLATFORM_SHARE * 100)}%</strong>.
          Members get:
        </GuideStep>
        <ul className="ml-11 text-sm text-zinc-400 space-y-1 list-disc list-inside mb-4">
          {STATION_MEMBER_PERKS_MEMBER.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
        <GuideStep n={2} title="Milestone rewards">
          When your station hits goals, all current members share a reward pool proportional to tier. Track progress in
          your owner dashboard and on the public membership panel:
        </GuideStep>
        <ul className="ml-11 text-sm text-zinc-400 space-y-1 list-disc list-inside mb-4">
          {STATION_MILESTONES.map((m) => (
            <li key={m.key}>
              {m.label} — {m.rewardPool} DROP pool
            </li>
          ))}
        </ul>
        <GuideStep n={3} title="Promote your channel">
          Share <code className="text-xs bg-white/10 px-1 rounded">/station/your-slug</code> on socials and your website embed.
          During resident live shows, fans see a &quot;Become a member&quot; promo on the stream page.
        </GuideStep>
        <GuideStep n={4} title="Fan-facing docs">
          Point listeners to the <Link href={`${HELP_LINKS.fans}#membership`} className="text-[#53fc18] hover:underline">fan guide → Membership</Link> for
          perk details and revenue splits.
        </GuideStep>
      </GuideSection>

      <GuideSection id="support" title="Support">
        <GuideStep n={1} title="Get help">
          Station setup, embed issues, or billing — use{" "}
          <Link href={HELP_LINKS.support} className="text-[#53fc18] hover:underline">live support chat</Link> on Support
          (every chat creates a ticket), or email{" "}
          <a href="mailto:support@livebooth.uk" className="text-[#53fc18] hover:underline">support@livebooth.uk</a>.
        </GuideStep>
      </GuideSection>
    </HelpGuideLayout>
  );
}
