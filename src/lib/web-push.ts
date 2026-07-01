import webpush from "web-push";
import { prisma } from "./db";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@livebooth.local";

let configured = false;

export function isPushConfigured() {
  return Boolean(publicKey && privateKey);
}

export function getVapidPublicKey() {
  return publicKey ?? null;
}

function ensureConfigured() {
  if (!isPushConfigured()) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey!, privateKey!);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

async function sendToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  if (!ensureConfigured()) return false;

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    );
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
    }
    return false;
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      const ok = await sendToSubscription(sub, payload);
      if (ok) sent += 1;
    }),
  );
  return sent;
}

export async function sendGoLivePushToFollowers(
  followerIds: string[],
  djName: string,
  streamTitle: string,
  username: string,
) {
  if (followerIds.length === 0 || !ensureConfigured()) return 0;

  const payload: PushPayload = {
    title: `${djName} is live`,
    body: `${streamTitle} — the drop starts now`,
    url: `/stream/${username}`,
    tag: `go-live-${username}`,
  };

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: followerIds } },
  });
  if (subs.length === 0) return 0;

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      const ok = await sendToSubscription(sub, payload);
      if (ok) sent += 1;
    }),
  );
  return sent;
}
