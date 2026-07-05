import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  createConnectDashboardLink,
  createConnectOnboardingLink,
  getOrCreateConnectAccount,
  isStripeConnectEnabled,
  syncConnectAccountStatus,
} from "@/lib/stripe-connect";

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (auth.role !== "dj" && auth.role !== "station" && auth.role !== "admin") {
    return error("Creators only", 403);
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: {
      stripeConnectAccountId: true,
      stripeConnectOnboarded: true,
    },
  });
  if (!user) return error("User not found", 404);

  let dashboardUrl: string | null = null;
  if (user.stripeConnectAccountId && user.stripeConnectOnboarded) {
    dashboardUrl = await createConnectDashboardLink(user.stripeConnectAccountId);
  }

  return json({
    configured: isStripeConnectEnabled(),
    onboarded: user.stripeConnectOnboarded,
    hasAccount: Boolean(user.stripeConnectAccountId),
    dashboardUrl,
  });
}

export async function POST() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (!isStripeConnectEnabled()) {
    return error("Stripe Connect not configured", 503);
  }

  if (auth.role !== "dj" && auth.role !== "station" && auth.role !== "admin") {
    return error("Creators only", 403);
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { id: true, email: true, stripeConnectAccountId: true, stripeConnectOnboarded: true },
  });
  if (!user) return error("User not found", 404);

  try {
    const accountId = await getOrCreateConnectAccount(user);
    if (accountId !== user.stripeConnectAccountId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeConnectAccountId: accountId },
      });
    }

    const onboarded = await syncConnectAccountStatus(accountId);
    if (onboarded) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeConnectOnboarded: true },
      });
      const dashboardUrl = await createConnectDashboardLink(accountId);
      return json({ onboarded: true, dashboardUrl });
    }

    const url = await createConnectOnboardingLink(accountId);
    return json({ onboarded: false, url });
  } catch (e) {
    console.error("stripe connect onboard:", e);
    return error("Could not start payout setup", 500);
  }
}
