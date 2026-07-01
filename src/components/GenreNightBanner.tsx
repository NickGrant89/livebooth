import Link from "next/link";
import { GENRE_NIGHTS, genreLabels } from "@/lib/constants";

export function GenreNightBanner() {
  const day = new Date().getUTCDay();
  const night = GENRE_NIGHTS[day];
  if (!night) return null;

  return (
    <Link
      href={`/?genre=${night.genre}`}
      className="mx-4 lg:mx-6 mt-4 block rounded-xl border border-purple-500/25 bg-gradient-to-r from-purple-500/10 to-[#53fc18]/5 px-4 py-3 hover:border-purple-500/40 transition-colors"
    >
      <p className="text-sm font-semibold">
        {night.emoji} Tonight: <span className="text-purple-300">{night.label}</span>
      </p>
      <p className="text-xs text-zinc-500 mt-0.5">
        Browse live {genreLabels[night.genre]} sets — or go live and own the night
      </p>
    </Link>
  );
}
