"use client";

import { useStationFollow } from "@/hooks/useStationFollow";

export function StationFollowerCount({
  slug,
  initialCount,
}: {
  slug: string;
  initialCount: number;
}) {
  const { followerCount, checked } = useStationFollow(slug);
  const value = checked ? followerCount : initialCount;
  return <>{value.toLocaleString()}</>;
}
