import Link from "next/link";
import { BookOpen, Headphones, Radio, HelpCircle, ArrowRight, Building2, Map, FileText } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const guides = [
  {
    href: "/help/fans",
    title: "Fan guide",
    description: "Watch live sets, tip DJs, unlock track IDs, earn achievements, stake on favourites, and use your wallet.",
    icon: Headphones,
    color: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
    cta: "I'm a fan",
  },
  {
    href: "/help/djs",
    title: "DJ guide",
    description: "Go live with OBS, preview your feed, earn DROP, manage your booth, collab, and grow your audience.",
    icon: Radio,
    color: "from-[#53fc18]/20 to-cyan-500/20 border-[#53fc18]/30",
    cta: "I'm a DJ",
  },
  {
    href: "/help/stations",
    title: "Station guide",
    description: "Run a branded radio channel — residents, embed player, relay, and station staking milestones.",
    icon: Building2,
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
    cta: "I run a station",
  },
  {
    href: "/support",
    title: "Help & support",
    description: "Live support chat (logged as tickets), FAQs, streaming troubleshooting, and contact options.",
    icon: HelpCircle,
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
    cta: "Get support",
  },
];

export default function HelpHubPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="h-8 w-8 text-[#53fc18]" />
          <h1 className="text-3xl font-bold text-white">Help center</h1>
        </div>
        <p className="text-zinc-400">
          Everything you need on {APP_NAME} — {APP_TAGLINE}. Pick your role below, or open your{" "}
          <Link href="/guide" className="text-[#53fc18] hover:underline">personalised guide</Link> when signed in.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link href="/help/fans" className="btn-primary rounded-xl px-5 py-2.5 text-sm">
          Fan quick start
        </Link>
        <Link
          href="/help/djs"
          className="rounded-xl border border-[#53fc18]/40 bg-[#53fc18]/10 px-5 py-2.5 text-sm text-[#53fc18] hover:bg-[#53fc18]/20 transition-colors"
        >
          DJ quick start
        </Link>
        <Link
          href="/support"
          className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors"
        >
          FAQ &amp; live chat
        </Link>
      </div>

      <div className="space-y-4">
        {guides.map((g) => {
          const Icon = g.icon;
          return (
            <Link
              key={g.href}
              href={g.href}
              className={`flex items-start gap-4 rounded-2xl border bg-gradient-to-br p-6 hover:scale-[1.01] transition-transform ${g.color}`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/30">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {g.title}
                  <ArrowRight className="h-4 w-4 text-zinc-500" />
                </h2>
                <p className="text-sm text-zinc-400 mt-1">{g.description}</p>
                <span className="inline-block mt-3 text-xs font-medium text-[#53fc18]">{g.cta} →</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 grid sm:grid-cols-2 gap-4">
        <Link
          href="/roadmap"
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#15CFF4]/30 transition-colors"
        >
          <Map className="h-5 w-5 text-[#15CFF4]" />
          <div>
            <p className="text-sm font-semibold text-white">Product roadmap</p>
            <p className="text-xs text-zinc-500 mt-0.5">What we&apos;ve shipped and what&apos;s next</p>
          </div>
        </Link>
        <Link
          href="/policies"
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-colors"
        >
          <FileText className="h-5 w-5 text-zinc-400" />
          <div>
            <p className="text-sm font-semibold text-white">Policies & procedures</p>
            <p className="text-xs text-zinc-500 mt-0.5">Community rules, go-live steps, moderation</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
