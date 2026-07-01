import { prisma } from "@/lib/db";
import { buyDrop, getOrCreateBalance } from "@/lib/ledger";
import { isStripeConfigured } from "@/lib/stripe";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { z } from "zod";

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const balance = await getOrCreateBalance(auth.id);
  const entries = await prisma.ledgerEntry.findMany({
    where: { userId: auth.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({
    balance: balance.balance,
    totalEarned: balance.totalEarned,
    entries: entries.map((e) => ({
      id: e.id,
      amount: e.amount,
      type: e.type,
      reference: e.reference,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

const buySchema = z.object({ amount: z.number().positive().max(10000) });

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = buySchema.parse(await request.json());
    if (isStripeConfigured() && process.env.NODE_ENV === "production") {
      return error("Use Stripe checkout to buy DROP", 400);
    }
    const balance = await buyDrop(auth.id, body.amount, "dev");
    return json({ balance: balance.balance });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid amount");
    return error("Purchase failed", 500);
  }
}

const walletSchema = z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) });

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = walletSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({
      where: { walletAddress: body.address },
    });
    if (existing && existing.id !== auth.id) {
      return error("Wallet already linked", 409);
    }

    await prisma.user.update({
      where: { id: auth.id },
      data: { walletAddress: body.address },
    });

    return json({ walletAddress: body.address });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid wallet address");
    return error("Failed to link wallet", 500);
  }
}

export async function DELETE() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  await prisma.user.update({
    where: { id: auth.id },
    data: { walletAddress: null },
  });

  return json({ ok: true, walletAddress: null });
}
