import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  VIP_SUB_COST,
  VIP_REQUEST_COST,
  VIP_TRACK_UNLOCK_COST,
  REQUEST_COST,
  TRACK_UNLOCK_COST,
} from "@/lib/constants";
import { isVipSubscriber } from "@/lib/subscriptions";
import { debitUser, creditUser } from "@/lib/ledger";
import { evaluateAchievements } from "@/lib/achievements";
import { listActiveSubscriptions } from "@/lib/subscriptions";
import { z } from "zod";

const schema = z.object({ djUsername: z.string() });

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const djUsername = new URL(request.url).searchParams.get("djUsername");
  if (!djUsername) return error("djUsername required", 400);

  const dj = await prisma.user.findUnique({ where: { username: djUsername } });
  if (!dj) return error("DJ not found", 404);

  const subscribed = await isVipSubscriber(auth.id, dj.id);

  return json({
    subscribed,
    perks: {
      requestCost: VIP_REQUEST_COST,
      trackUnlockCost: VIP_TRACK_UNLOCK_COST,
      standardRequestCost: REQUEST_COST,
      standardTrackUnlockCost: TRACK_UNLOCK_COST,
      discountLabel: "30% off requests & track IDs",
    },
  });
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const djUsername = new URL(request.url).searchParams.get("djUsername");
  if (!djUsername) return error("djUsername required", 400);

  const dj = await prisma.user.findUnique({ where: { username: djUsername } });
  if (!dj) return error("DJ not found", 404);

  await prisma.subscription.updateMany({
    where: { fanId: auth.id, djId: dj.id, status: "active" },
    data: { status: "cancelled" },
  });

  return json({ ok: true, subscribed: false });
}

/** List fan's active VIP subs */
export async function PUT() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const subs = await listActiveSubscriptions(auth.id);
  return json({
    subscriptions: subs.map((s) => ({
      djUsername: s.dj.username,
      djName: s.dj.displayName,
      avatar: s.dj.avatar,
      nextBillingAt: s.nextBillingAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = schema.parse(await request.json());

    const dj = await prisma.user.findUnique({ where: { username: body.djUsername } });
    if (!dj) return error("DJ not found", 404);

    const existing = await prisma.subscription.findUnique({
      where: { fanId_djId: { fanId: auth.id, djId: dj.id } },
    });
    if (existing?.status === "active") {
      return json({ ok: true, subscribed: true });
    }

    const ok = await debitUser(auth.id, VIP_SUB_COST, "subscription", dj.id);
    if (!ok) return error("Insufficient DROP", 402);

    const djShare = VIP_SUB_COST * 0.9;
    await creditUser(dj.id, djShare, "subscription_earned", auth.id);

    const nextBilling = new Date(Date.now() + 30 * 86400000);
    await prisma.subscription.upsert({
      where: { fanId_djId: { fanId: auth.id, djId: dj.id } },
      create: {
        fanId: auth.id,
        djId: dj.id,
        amount: VIP_SUB_COST,
        nextBillingAt: nextBilling,
      },
      update: { status: "active", nextBillingAt: nextBilling },
    });

    await evaluateAchievements(auth.id);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid subscription");
    return error("Subscription failed", 500);
  }
}
