import { z } from "zod";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import {
  adminUpdateWithdrawal,
  listAdminWithdrawals,
} from "@/lib/withdrawals";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  const rows = await listAdminWithdrawals(status);
  return json({
    requests: rows.map((r) => ({
      id: r.id,
      dropAmount: r.dropAmount,
      feeDrop: r.feeDrop,
      netUsdCents: r.netUsdCents,
      status: r.status,
      rejectReason: r.rejectReason,
      paidAt: r.paidAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    })),
  });
}

const actionSchema = z.object({
  requestId: z.string(),
  action: z.enum(["approve", "reject", "mark_paid"]),
  rejectReason: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = actionSchema.parse(await request.json());
    const result = await adminUpdateWithdrawal(
      body.requestId,
      admin.id,
      body.action,
      body.rejectReason,
    );
    if (!result.ok) return error(result.error, 400);

    await logAdminAction(admin.id, `withdraw_${body.action}`, body.requestId, undefined, request);

    return json({ ok: true, status: result.request.status });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    console.error("admin withdraw:", e);
    return error("Action failed", 500);
  }
}
