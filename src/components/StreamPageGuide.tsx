"use client";

import { StreamViewerGuide } from "@/components/StreamViewerGuide";

export function StreamPageGuide({ isHost }: { isHost: boolean }) {
  if (isHost) return null;
  return <StreamViewerGuide />;
}
