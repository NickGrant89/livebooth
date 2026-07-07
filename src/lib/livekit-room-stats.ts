import "server-only";

/** Parse collab studio role from LiveKit identity (`userId-host-tabId` or legacy `userId`). */
export function collabRoleFromIdentity(identity: string): "host" | "partner" | null {
  if (identity.includes("-host-") || identity.endsWith("-host")) return "host";
  if (identity.includes("-partner-") || identity.endsWith("-partner")) return "partner";
  return null;
}

export function summarizeCollabRoomParticipants(
  participants: Array<{ identity: string; tracks: Array<{ type: number }> }>,
  videoTrackType: number,
): { connectedDjs: number; videoPublishers: number } {
  const connectedRoles = new Set<string>();
  const videoRoles = new Set<string>();

  for (const p of participants) {
    const role = collabRoleFromIdentity(p.identity);
    const slot = role ?? p.identity;
    connectedRoles.add(slot);

    const hasVideo = p.tracks.some((t) => t.type === videoTrackType);
    if (hasVideo) videoRoles.add(slot);
  }

  return {
    connectedDjs: connectedRoles.size,
    videoPublishers: videoRoles.size,
  };
}
