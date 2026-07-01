import Link from "next/link";
import { genreLabels, GENRES, GENRE_GROUPS } from "@/lib/constants";

export function GenreFilter({ active }: { active?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Link
          href="/"
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
            !active
              ? "bg-[#53fc18] text-black font-bold"
              : "glass text-zinc-400 hover:text-white"
          }`}
        >
          All
        </Link>
        {GENRE_GROUPS.map((group) => (
          <span
            key={group.label}
            className="shrink-0 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 bg-white/[0.02] border border-white/5"
            title={group.genres.map((g) => genreLabels[g]).join(", ")}
          >
            {group.label}
          </span>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {GENRES.map((g) => (
          <Link
            key={g}
            href={`/?genre=${g}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              active === g
                ? "bg-[#53fc18] text-black font-bold"
                : "glass text-zinc-400 hover:text-white"
            }`}
          >
            {genreLabels[g]}
          </Link>
        ))}
      </div>
    </div>
  );
}
