import { Trophy } from "lucide-react";
import { getLeaderboardData } from "@/lib/leaderboard";
import { LeaderboardView } from "@/components/LeaderboardView";
import { DROP_TOKEN_SYMBOL, APP_TAGLINE } from "@/lib/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const data = await getLeaderboardData();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500/20 to-[#53fc18]/20 border border-[#53fc18]/30">
            <Trophy className="h-6 w-6 text-[#53fc18]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Rankings</h1>
            <p className="text-sm text-zinc-500">{APP_TAGLINE} — top DJs, fans &amp; stations</p>
          </div>
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          Rankings use live platform data ({DROP_TOKEN_SYMBOL} tips, followers, peak viewers). Updated on each visit.
        </p>
      </div>

      <LeaderboardView data={data} />

      <p className="text-center text-xs text-zinc-600 mt-8">
        Want to climb the board?{" "}
        <Link href="/help/djs" className="text-[#53fc18] hover:underline">
          DJ guide
        </Link>
        {" · "}
        <Link href="/help/fans" className="text-[#53fc18] hover:underline">
          Fan guide
        </Link>
      </p>
    </div>
  );
}
