import Link from "next/link";
import { Crown, Megaphone, Tv, Coins, Wallet } from "lucide-react";
import { CREATOR_MONETIZATION_COPY } from "@/lib/staking-ui";
import { HELP_LINKS } from "@/lib/help-links";

export function CreatorMonetizationPanel({ isLive }: { isLive: boolean }) {
  const c = CREATOR_MONETIZATION_COPY;

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 mb-6">
      <h3 className="text-sm font-bold text-purple-200">{c.title}</h3>
      <p className="text-xs text-zinc-500 mt-1.5 mb-4">{c.intro}</p>
      <ul className="space-y-3 text-xs text-zinc-400">
        <li className="flex gap-2">
          <Crown className="h-4 w-4 shrink-0 text-purple-300 mt-0.5" />
          <span>
            <strong className="text-zinc-200">{c.membershipTitle}</strong> — {c.membershipBody}
          </span>
        </li>
        <li className="flex gap-2">
          <Coins className="h-4 w-4 shrink-0 text-[#53fc18] mt-0.5" />
          <span>
            <strong className="text-zinc-200">{c.tipsTitle}</strong> — {c.tipsBody}
          </span>
        </li>
        <li className="flex gap-2">
          <Wallet className="h-4 w-4 shrink-0 text-sky-300 mt-0.5" />
          <span>
            <strong className="text-zinc-200">{c.payoutTitle}</strong> —{" "}
            <Link href={HELP_LINKS.wallet} className="text-[#53fc18] hover:underline">
              {c.payoutBody}
            </Link>
          </span>
        </li>
        <li className="flex gap-2">
          <Megaphone className="h-4 w-4 shrink-0 text-amber-300 mt-0.5" />
          <span>
            <strong className="text-zinc-200">{c.brandTitle}</strong> —{" "}
            {isLive ? c.brandLive : c.brandOffline}
          </span>
        </li>
        <li className="flex gap-2">
          <Tv className="h-4 w-4 shrink-0 text-sky-300 mt-0.5" />
          <span>
            <strong className="text-zinc-200">{c.adsTitle}</strong> — {c.adsBody}{" "}
            <Link href={HELP_LINKS.support} className="text-[#53fc18] hover:underline">
              {c.adsLink}
            </Link>
          </span>
        </li>
      </ul>
    </div>
  );
}
