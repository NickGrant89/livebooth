import type { ReactNode } from "react";
import { profileImageSrc } from "@/lib/profile-images";
import { StationBrandAvatar } from "@/components/StationBrandAvatar";

type StationProfileHeroProps = {
  name: string;
  tagline?: string;
  avatar?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  badge?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  compact?: boolean;
};

export function StationProfileHero({
  name,
  tagline,
  avatar = "",
  avatarUrl,
  bannerUrl,
  badge,
  actions,
  meta,
  compact = false,
}: StationProfileHeroProps) {
  const bannerSrc = profileImageSrc(bannerUrl);
  const bannerHeight = compact ? "h-24 sm:h-28" : "h-32 sm:h-36";
  const avatarSize = compact ? "xl" : "2xl";
  const overlap = compact ? "-mt-12 sm:-mt-14" : "-mt-14 sm:-mt-16";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#141416] overflow-hidden">
      <div
        className={`relative ${bannerHeight} overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0a0a0c] to-[#141416]`}
      >
        {bannerSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(83,252,24,0.12),_transparent_60%)]" />
        )}
      </div>
      <div className="px-4 sm:px-6 pb-5 sm:pb-6">
        <div className={`relative z-10 ${overlap} mb-4`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <StationBrandAvatar
              name={name}
              avatar={avatar}
              avatarUrl={avatarUrl}
              size={avatarSize}
              borderClassName="border-4 border-[#141416] shadow-lg shadow-black/40"
            />
            {actions ? (
              <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">{actions}</div>
            ) : null}
          </div>
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={`font-bold text-white ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>
              {name}
            </h1>
            {badge}
          </div>
          {tagline ? (
            <p className={`text-zinc-400 ${compact ? "text-sm" : "text-sm sm:text-base"}`}>{tagline}</p>
          ) : null}
          {meta}
        </div>
      </div>
    </div>
  );
}
