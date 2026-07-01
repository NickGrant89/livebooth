import { tierColors } from "@/lib/constants";

interface AchievementBadgeProps {
  icon: string;
  name: string;
  tier: string;
  size?: "sm" | "md" | "lg";
  unlocked?: boolean;
}

export function AchievementBadge({
  icon,
  name,
  tier,
  size = "md",
  unlocked = true,
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: "h-10 w-10 text-lg",
    md: "h-14 w-14 text-2xl",
    lg: "h-20 w-20 text-4xl",
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br ${tierColors[tier]} ${sizeClasses[size]} ${
          unlocked ? "opacity-100" : "opacity-30 grayscale"
        } shadow-lg transition-all`}
        title={name}
      >
        <span>{icon}</span>
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-xs">
            🔒
          </div>
        )}
      </div>
      {size !== "sm" && (
        <span className="text-xs text-zinc-400 text-center max-w-[80px] line-clamp-2">
          {name}
        </span>
      )}
    </div>
  );
}
