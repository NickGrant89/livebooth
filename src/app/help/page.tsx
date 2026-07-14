import Link from "next/link";
import {
  BookOpen,
  Headphones,
  Radio,
  HelpCircle,
  ArrowRight,
  Building2,
  Map,
  FileText,
  TrendingUp,
  Wallet,
  Mail,
  Eye,
  MessageCircle,
} from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { HELP_LINKS, HELP_TOPICS } from "@/lib/help-links";

const guides = [
  {
    href: HELP_LINKS.fans,
    title: "Fan guide",
    description:
      "Watch live sets, tip DJs, unlock track IDs, stake for perks, earn achievements, and use your wallet.",
    icon: Headphones,
    color: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
    cta: "I'm a fan",
  },
  {
    href: HELP_LINKS.djs,
    title: "DJ guide",
    description:
      "Go live with OBS, preview your feed, earn DROP, grow supporters, and manage your booth.",
    icon: Radio,
    color: "from-[#53fc18]/20 to-cyan-500/20 border-[#53fc18]/30",
    cta: "I'm a DJ",
  },
  {
    href: HELP_LINKS.stations,
    title: "Station guide",
    description:
      "Run a branded radio channel — residents, embed player, relay, and member milestone rewards.",
    icon: Building2,
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
    cta: "I run a station",
  },
  {
    href: HELP_LINKS.support,
    title: "Help & support",
    description:
      "Live support chat (logged as tickets), FAQs, streaming troubleshooting, and contact options.",
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
          Everything you need on {APP_NAME} — {APP_TAGLINE}. Pick your role below, browse a topic, or open your{" "}
          <Link href={HELP_LINKS.guide} className="text-[#53fc18] hover:underline">
            personalised guide
          </Link>{" "}
          when signed in.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link href={HELP_LINKS.fans} className="btn-primary rounded-xl px-5 py-2.5 text-sm">
          Fan quick start
        </Link>
        <Link
          href={HELP_LINKS.djs}
          className="rounded-xl border border-[#53fc18]/40 bg-[#53fc18]/10 px-5 py-2.5 text-sm text-[#53fc18] hover:bg-[#53fc18]/20 transition-colors"
        >
          DJ quick start
        </Link>
        <Link
          href={HELP_LINKS.support}
          className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors"
        >
          FAQ &amp; live chat
        </Link>
        <Link
          href={`${HELP_LINKS.fans}#staking`}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-sm text-cyan-200 hover:bg-cyan-500/20 transition-colors"
        >
          Staking perks
        </Link>
      </div>

      <div className="mb-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Browse by topic</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {HELP_TOPICS.map((topic) => {
            const Icon =
              topic.title.includes("Staking") ? TrendingUp
              : topic.title.includes("Replay") ? Eye
              : topic.title.includes("Account") ? Mail
              : topic.title.includes("Wallet") ? Wallet
              : Eye;
            return (
              <Link
                key={topic.href}
                href={topic.href}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#53fc18]/30 transition-colors"
              >
                <Icon className="h-5 w-5 text-[#53fc18] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">{topic.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{topic.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Guides by role</h2>
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
          href={HELP_LINKS.roadmap}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#15CFF4]/30 transition-colors"
        >
          <Map className="h-5 w-5 text-[#15CFF4]" />
          <div>
            <p className="text-sm font-semibold text-white">Product roadmap</p>
            <p className="text-xs text-zinc-500 mt-0.5">What we&apos;ve shipped and what&apos;s next</p>
          </div>
        </Link>
        <Link
          href={HELP_LINKS.policies}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-colors"
        >
          <FileText className="h-5 w-5 text-zinc-400" />
          <div>
            <p className="text-sm font-semibold text-white">Policies & procedures</p>
            <p className="text-xs text-zinc-500 mt-0.5">Community rules, go-live steps, moderation</p>
          </div>
        </Link>
        <Link
          href={HELP_LINKS.transparency}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#53fc18]/30 transition-colors"
        >
          <Eye className="h-5 w-5 text-[#53fc18]" />
          <div>
            <p className="text-sm font-semibold text-white">DROP transparency</p>
            <p className="text-xs text-zinc-500 mt-0.5">Fees, circulation, and on-chain addresses</p>
          </div>
        </Link>
        <Link
          href={HELP_LINKS.support}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-amber-500/30 transition-colors"
        >
          <MessageCircle className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-white">Live support chat</p>
            <p className="text-xs text-zinc-500 mt-0.5">Fastest way to get help — chats become tickets</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
