import type { StakerTier } from "@/lib/staker-perks";

const TIER_CLASS: Record<StakerTier, string> = {
  member: "bg-cyan-500/15 text-cyan-200 border-cyan-500/30",
  supporter: "bg-amber-500/15 text-amber-200 border-amber-500/30",
};

export function StakerBadge({
  label,
  tier,
  className = "",
}: {
  label: string;
  tier?: StakerTier | null;
  className?: string;
}) {
  const style =
    tier && TIER_CLASS[tier]
      ? TIER_CLASS[tier]
      : "bg-cyan-500/15 text-cyan-200 border-cyan-500/30";

  return (
    <span
      className={`ml-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border ${style} ${className}`}
      title={`${label} member`}
    >
      {label}
    </span>
  );
}

export function tierFromBadgeLabel(label: string | null | undefined): StakerTier | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  if (lower === "supporter") return "supporter";
  if (lower === "member") return "member";
  return null;
}
