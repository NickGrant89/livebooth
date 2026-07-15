import { z } from "zod";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { getWithdrawableDrop, quoteWithdrawal } from "@/lib/redeem";
import { listUserWithdrawals, requestWithdrawal } from "@/lib/withdrawals";

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const rows = await listUserWithdrawals(auth.id);
  const { withdrawable, totalEarned } = await getWithdrawableDrop(auth.id);
  return json({
    quote: quoteWithdrawal(100),
    withdrawableDrop: Math.floor(withdrawable),
    totalEarned: Math.floor(totalEarned),
    requests: rows.map((r) => ({
      id: r.id,
      dropAmount: r.dropAmount,
      feeDrop: r.feeDrop,
      netUsdCents: r.netUsdCents,
      status: r.status,
      rejectReason: r.rejectReason,
      paidAt: r.paidAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

const requestSchema = z.object({
  amount: z.number().positive(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = requestSchema.parse(await request.json());
    const result = await requestWithdrawal(auth.id, body.amount);
    if (!result.ok) return error(result.error, 400);
    return json({
      ok: true,
      request: {
        id: result.request.id,
        status: result.request.status,
        netUsdCents: result.request.netUsdCents,
        feeDrop: result.request.feeDrop,
      },
      quote: result.quote,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid amount");
    console.error("withdraw:", e);
    return error("Withdrawal failed", 500);
  }
}
