import { prisma } from "@/lib/db";
import { json, requireApiUser, isApiError } from "@/lib/api-utils";
import { isLiveKitConfigured } from "@/lib/livekit";
import { pickCanonicalActiveCollab, pickCanonicalPendingCollab } from "@/lib/collab-pick";

export const dynamic = "force-dynamic";

type CheckItem = {
  id: string;
  ok: boolean;
  label: string;
  detail: string;
  action?: { label: string; href: string };
};

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const webrtcEnabled = isLiveKitConfigured();
  const livekitUrl = process.env.LIVEKIT_URL?.replace(/\/$/, "") ?? "";
  let livekitReachable: boolean | null = null;

  if (livekitUrl) {
    const httpBase = livekitUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
    try {
      const res = await fetch(httpBase, { signal: AbortSignal.timeout(5000), cache: "no-store" });
      livekitReachable = res.ok;
    } catch {
      livekitReachable = false;
    }
  }

  const stream = await prisma.stream.findFirst({
    where: { djId: auth.id, status: { in: ["preparing", "live"] } },
    select: { id: true, title: true, status: true },
  });

  const collabs = await prisma.streamCollab.findMany({
    where: {
      OR: [{ stream: { djId: auth.id } }, { partnerDjId: auth.id }],
      status: { in: ["pending", "active"] },
    },
    include: {
      stream: {
        select: {
          djId: true,
          title: true,
          status: true,
          createdAt: true,
          dj: { select: { username: true, displayName: true } },
        },
      },
      partnerStream: { select: { id: true, status: true } },
    },
  });

  const hostActive = pickCanonicalActiveCollab(collabs, { hostDjId: auth.id });
  const partnerActive = pickCanonicalActiveCollab(collabs, { partnerDjId: auth.id });
  const sentPending = pickCanonicalPendingCollab(collabs, { hostDjId: auth.id });
  const partnerPending = pickCanonicalPendingCollab(collabs, { partnerDjId: auth.id });

  const partnerUser = hostActive
    ? await prisma.user.findUnique({
        where: { id: hostActive.partnerDjId },
        select: { username: true },
      })
    : null;

  const checks: CheckItem[] = [
    {
      id: "webrtc",
      ok: webrtcEnabled,
      label: "WebRTC enabled on server",
      detail: webrtcEnabled
        ? "LiveKit is configured on Vercel."
        : "Set COLLAB_WEBRTC_ENABLED=true and LIVEKIT_* on Vercel.",
    },
    {
      id: "livekit",
      ok: livekitReachable === true,
      label: "LiveKit server reachable",
      detail:
        livekitReachable === true
          ? `Connected to ${livekitUrl.replace(/^wss?:\/\//, "")}.`
          : livekitReachable === false
            ? "Could not reach rtc.livebooth.uk from the app server."
            : "LiveKit URL not configured.",
    },
    {
      id: "dj",
      ok: auth.role === "dj" || auth.role === "admin",
      label: "Signed in as DJ",
      detail:
        auth.role === "dj" || auth.role === "admin"
          ? `Logged in as @${auth.username}.`
          : "Collab requires a creator (DJ) account.",
      action: auth.role === "fan" ? { label: "Sign up as creator", href: "/signup" } : undefined,
    },
    {
      id: "stream",
      ok: Boolean(stream),
      label: "Host has a stream session",
      detail: stream
        ? `"${stream.title}" (${stream.status}).`
        : "Quick setup creates a preview stream for you automatically.",
      action: !stream ? { label: "Or open Go Live", href: "/go-live" } : undefined,
    },
    {
      id: "collab",
      ok: Boolean(hostActive || partnerActive),
      label: "Active collab with partner",
      detail: hostActive
        ? `Active with @${partnerUser?.username ?? "partner"}.`
        : partnerActive
          ? `Active with @${partnerActive.stream.dj.username}.`
          : sentPending
            ? "Invite sent — partner must accept."
            : partnerPending
              ? `Invite from @${partnerPending.stream.dj.username} — tap Accept below.`
              : "Use Quick setup to invite your partner.",
    },
  ];

  const studio = hostActive
    ? {
        collabId: hostActive.id,
        role: "host" as const,
        hostUsername: auth.username,
        partnerUsername: partnerUser?.username ?? null,
        compositorActive: hostActive.compositorActive,
      }
    : partnerActive
      ? {
          collabId: partnerActive.id,
          role: "partner" as const,
          hostUsername: partnerActive.stream.dj.username,
          partnerUsername: auth.username,
          compositorActive: partnerActive.compositorActive,
        }
      : null;

  return json({
    webrtcEnabled,
    livekitReachable,
    username: auth.username,
    checks,
    studio,
    studioReady: Boolean(webrtcEnabled && studio),
    pendingInvite: sentPending
      ? {
          collabId: sentPending.id,
          partnerUsername: (
            await prisma.user.findUnique({
              where: { id: sentPending.partnerDjId },
              select: { username: true },
            })
          )?.username,
        }
      : partnerPending
        ? {
            collabId: partnerPending.id,
            hostUsername: partnerPending.stream.dj.username,
            canAccept: true,
          }
        : null,
  });
}
