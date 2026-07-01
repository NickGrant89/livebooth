import { requireApiUser, json, error, isApiError } from "@/lib/api-utils";
import { isPushConfigured } from "@/lib/web-push";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (!isPushConfigured()) {
    return json({ configured: false, subscribed: false, count: 0 });
  }

  const count = await prisma.pushSubscription.count({ where: { userId: auth.id } });
  return json({ configured: true, subscribed: count > 0, count });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (!isPushConfigured()) {
    return error("Push notifications are not configured on this server", 503);
  }

  try {
    const body = schema.parse(await request.json());
    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      create: {
        userId: auth.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
      update: {
        userId: auth.id,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
    });
    return json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid push subscription");
    console.error("push subscribe:", e);
    return error("Failed to save subscription", 500);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    if (body.endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { userId: auth.id, endpoint: body.endpoint },
      });
    } else {
      await prisma.pushSubscription.deleteMany({ where: { userId: auth.id } });
    }
    return json({ ok: true });
  } catch (e) {
    console.error("push unsubscribe:", e);
    return error("Failed to remove subscription", 500);
  }
}
