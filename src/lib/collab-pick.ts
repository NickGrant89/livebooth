import "server-only";

type CollabRow = {
  id: string;
  status: string;
  partnerDjId: string;
  stream: {
    djId: string;
    status: string;
    createdAt: Date;
  };
};

function liveStreamScore(status: string): number {
  return status === "preparing" || status === "live" ? 2 : 0;
}

/** Prefer the active collab on a live/preparing host stream (newest first). */
export function pickCanonicalActiveCollab<T extends CollabRow>(
  collabs: T[],
  opts: { hostDjId?: string; partnerDjId?: string },
): T | undefined {
  let rows = collabs.filter((c) => c.status === "active");
  if (opts.hostDjId) rows = rows.filter((c) => c.stream.djId === opts.hostDjId);
  if (opts.partnerDjId) rows = rows.filter((c) => c.partnerDjId === opts.partnerDjId);
  if (rows.length === 0) return undefined;

  rows.sort((a, b) => {
    const byLive = liveStreamScore(b.stream.status) - liveStreamScore(a.stream.status);
    if (byLive !== 0) return byLive;
    return b.stream.createdAt.getTime() - a.stream.createdAt.getTime();
  });
  return rows[0];
}

export function pickCanonicalPendingCollab<T extends CollabRow>(
  collabs: T[],
  opts: { hostDjId?: string; partnerDjId?: string },
): T | undefined {
  let rows = collabs.filter((c) => c.status === "pending");
  if (opts.hostDjId) rows = rows.filter((c) => c.stream.djId === opts.hostDjId);
  if (opts.partnerDjId) rows = rows.filter((c) => c.partnerDjId === opts.partnerDjId);
  if (rows.length === 0) return undefined;

  rows.sort((a, b) => b.stream.createdAt.getTime() - a.stream.createdAt.getTime());
  return rows[0];
}
