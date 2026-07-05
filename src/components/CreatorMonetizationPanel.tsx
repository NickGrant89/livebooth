import Link from "next/link";
import { Crown, Megaphone, Tv } from "lucide-react";
import { DROP_TOKEN_SYMBOL, VIP_SUB_COST } from "@/lib/constants";

export function CreatorMonetizationPanel({ isLive }: { isLive: boolean }) {
  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 mt-4">
      <h3 className="text-sm font-bold text-purple-200">Monetization</h3>
      <p className="text-xs text-zinc-500 mt-1">
        Three ways to earn on LiveBooth — subscriptions, brand placement, and platform ads.
      </p>
      <ul className="mt-3 space-y-2.5 text-xs text-zinc-400">
        <li className="flex gap-2">
          <Crown className="h-4 w-4 shrink-0 text-purple-300 mt-0.5" />
          <span>
            <strong className="text-zinc-200">VIP subscriptions</strong> — fans pay {VIP_SUB_COST} {DROP_TOKEN_SYMBOL}/mo on your profile; you keep 90%.
          </span>
        </li>
        <li className="flex gap-2">
          <Megaphone className="h-4 w-4 shrink-0 text-amber-300 mt-0.5" />
          <span>
            <strong className="text-zinc-200">Brand deals / sponsored placement</strong> —{" "}
            {isLive ? (
              <>use Promote booth below for hero or grid spots on Discover.</>
            ) : (
              <>go live, then use Promote booth for hero or grid spots on Discover.</>
            )}
          </span>
        </li>
        <li className="flex gap-2">
          <Tv className="h-4 w-4 shrink-0 text-sky-300 mt-0.5" />
          <span>
            <strong className="text-zinc-200">In-stream ads</strong> — platform-managed sponsor banner under the player (admin-controlled).{" "}
            <Link href="/support" className="text-[#53fc18] hover:underline">
              Partner with us
            </Link>
          </span>
        </li>
      </ul>
    </div>
  );
}
