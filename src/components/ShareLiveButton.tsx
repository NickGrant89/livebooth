"use client";

import { ShareMenu } from "@/components/ShareMenu";

export function ShareLiveButton({
  username,
  djName,
  setTitle,
  variant = "secondary",
  label = "Share",
}: {
  username: string;
  djName: string;
  setTitle: string;
  variant?: "primary" | "secondary" | "ghost";
  label?: string;
}) {
  return (
    <ShareMenu
      kind="live"
      path={`/stream/${username}`}
      djName={djName}
      setTitle={setTitle}
      username={username}
      label={label}
      variant={variant}
    />
  );
}

export function ShareProfileButton({
  username,
  djName,
  isLive,
}: {
  username: string;
  djName: string;
  isLive?: boolean;
}) {
  return (
    <ShareMenu
      kind={isLive ? "live" : "profile"}
      path={isLive ? `/stream/${username}` : `/dj/${username}`}
      djName={djName}
      setTitle={isLive ? "Live now" : undefined}
      username={username}
      label="Share"
      variant="secondary"
    />
  );
}
