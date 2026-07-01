import Link from "next/link";
import { Logo } from "@/components/Logo";
import { APP_TAGLINE, DROP_TOKEN_SYMBOL } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-white/[0.06] bg-[#050508]/80">
      <div className="mx-auto max-w-[1600px] px-4 lg:px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div>
            <Logo size="sm" showTagline link={false} />
            <p className="text-sm text-zinc-500 mt-3 max-w-xs">{APP_TAGLINE}</p>
            <p className="text-xs text-zinc-600 mt-2">
              Powered by {DROP_TOKEN_SYMBOL} on VeChain
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
            <div>
              <p className="text-zinc-400 font-semibold mb-2">Watch</p>
              <ul className="space-y-1.5 text-zinc-500">
                <li><Link href="/" className="hover:text-white transition-colors">Discover</Link></li>
                <li><Link href="/residencies" className="hover:text-white transition-colors">Radio stations</Link></li>
                <li><Link href="/leaderboard" className="hover:text-white transition-colors">Rankings</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-zinc-400 font-semibold mb-2">Create</p>
              <ul className="space-y-1.5 text-zinc-500">
                <li><Link href="/go-live" className="hover:text-white transition-colors">Go Live</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-zinc-400 font-semibold mb-2">Earn</p>
              <ul className="space-y-1.5 text-zinc-500">
                <li><Link href="/wallet" className="hover:text-white transition-colors">Wallet</Link></li>
                <li><Link href="/achievements" className="hover:text-white transition-colors">Achievements</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-zinc-400 font-semibold mb-2">Help</p>
              <ul className="space-y-1.5 text-zinc-500">
                <li><Link href="/help/fans" className="hover:text-white transition-colors">Fan guide</Link></li>
                <li><Link href="/help/djs" className="hover:text-white transition-colors">DJ guide</Link></li>
                <li><Link href="/help/stations" className="hover:text-white transition-colors">Station guide</Link></li>
                <li><Link href="/support" className="hover:text-white transition-colors">Support & FAQ</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600">
          <span>© {new Date().getFullYear()} LiveBooth · livebooth.fm</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-zinc-400">Terms</Link>
            <Link href="/privacy" className="hover:text-zinc-400">Privacy</Link>
            <Link href="/help" className="hover:text-zinc-400">Help</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
