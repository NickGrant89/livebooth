import Link from "next/link";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

type RoadmapItem = {
  title: string;
  detail: string;
  status: "done" | "active" | "planned";
};

type Phase = {
  label: string;
  period: string;
  items: RoadmapItem[];
};

const PHASES: Phase[] = [
  {
    label: "Phase 1 — Foundation",
    period: "Q2 2026",
    items: [
      { title: "Live streaming (OBS + RTMP/HLS)", detail: "Go-live preview, VPS ingest, fan watch page", status: "done" },
      { title: "DROP tipping & wallet ledger", detail: "In-app balance, tips, track unlocks, quests", status: "done" },
      { title: "DJ profiles, archive & discover", detail: "Follow, share, set grades, leaderboard", status: "done" },
      { title: "VeChain testnet contracts", detail: "DROP token, TipRouter, AchievementVault", status: "done" },
    ],
  },
  {
    label: "Phase 2 — On-chain & polish",
    period: "Q3 2026",
    items: [
      { title: "Same-origin HLS preview proxy", detail: "Reliable OBS preview on production", status: "done" },
      { title: "Privy embedded wallets", detail: "Email login + one-click on-chain tips", status: "active" },
      { title: "On-chain tips during live sets", detail: "TipRouter with fee delegation", status: "active" },
      { title: "On-chain achievement claims", detail: "Signed claims via AchievementVault", status: "active" },
      { title: "Live support chat", detail: "Chat on /support — logged as tickets, admin replies in dashboard", status: "done" },
      { title: "Station Pro & residencies", detail: "Branded channels, resident lineups", status: "planned" },
    ],
  },
  {
    label: "Phase 3 — Growth",
    period: "Q4 2026",
    items: [
      { title: "Mobile-optimised watch & chat", detail: "Theatre mode, push alerts, share flows", status: "planned" },
      { title: "DROP mainnet launch", detail: "VeChain mainnet migration path", status: "planned" },
      { title: "Creator payouts & redeem", detail: "Wallet cash-out, admin treasury, Stripe Connect auto-payout", status: "done" },
      { title: "Public transparency page", detail: "/transparency — DROP circulation, fees, on-chain treasury", status: "done" },
      { title: "Clip export & social clips", detail: "Share highlights from replays", status: "planned" },
    ],
  },
  {
    label: "Phase 4 — Ecosystem",
    period: "2027",
    items: [
      { title: "Third-party embed widgets", detail: "Station embeds for external sites", status: "planned" },
      { title: "API for partners", detail: "Read-only discover + webhook integrations", status: "planned" },
      { title: "Multi-region ingest", detail: "Lower latency for global DJs", status: "planned" },
    ],
  },
];

function StatusIcon({ status }: { status: RoadmapItem["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-[#53fc18] shrink-0" />;
  if (status === "active") return <Clock className="h-4 w-4 text-[#15CFF4] shrink-0" />;
  return <Circle className="h-4 w-4 text-zinc-600 shrink-0" />;
}

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">{APP_NAME} roadmap</h1>
      <p className="text-zinc-400 text-sm mb-8">
        What we&apos;ve shipped, what we&apos;re building, and what&apos;s next. Updated regularly —{" "}
        <Link href="/support" className="text-[#53fc18] hover:underline">tell us what you want</Link>.
      </p>

      <div className="space-y-10">
        {PHASES.map((phase) => (
          <section key={phase.label}>
            <div className="flex flex-wrap items-baseline gap-2 mb-4">
              <h2 className="text-lg font-bold text-white">{phase.label}</h2>
              <span className="text-xs text-zinc-500">{phase.period}</span>
            </div>
            <ul className="space-y-3">
              {phase.items.map((item) => (
                <li
                  key={item.title}
                  className="flex gap-3 rounded-xl border border-white/5 bg-[#141416] px-4 py-3"
                >
                  <StatusIcon status={item.status} />
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{item.detail}</p>
                    <p className="text-[10px] uppercase tracking-wide mt-1.5 text-zinc-600">
                      {item.status === "done" ? "Shipped" : item.status === "active" ? "In progress" : "Planned"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 text-xs text-zinc-600">
        Priorities may shift based on creator feedback and infrastructure needs.
      </p>
    </div>
  );
}
