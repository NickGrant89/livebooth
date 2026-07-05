import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function StreamInStreamAdBanner({
  enabled,
  label,
  url,
}: {
  enabled: boolean;
  label: string;
  url: string;
}) {
  if (!enabled || !url.trim()) return null;

  return (
    <div className="border-t border-white/[0.06] bg-[#0a0a0f]/90 px-3 sm:px-4 py-2">
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90 hover:border-amber-500/40 transition-colors"
      >
        <span>
          <span className="font-bold uppercase tracking-wide text-amber-300/80 mr-2">Sponsored</span>
          {label}
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </Link>
    </div>
  );
}
