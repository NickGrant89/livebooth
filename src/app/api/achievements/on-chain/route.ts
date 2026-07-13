import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { normalizeTxHash } from "@/lib/web3/verify-tip";
import { verifyOnChainClaim } from "@/lib/web3/verify-claim";
import { z } from "zod";

const schema = z.object({
  achievementId: z.string(),
  txHash: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = schema.parse(await request.json());
    const txHash = normalizeTxHash(body.txHash);
    if (!txHash) return error("Invalid transaction hash", 400);

    const ua = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId: auth.id, achievementId: body.achievementId } },
      include: { achievement: true },
    });
    if (!ua?.unlockedAt) return error("Achievement not unlocked", 400);
    if (ua.claimedAt) return error("Already claimed", 400);

    const dbUser = await prisma.user.findUnique({ where: { id: auth.id } });
    if (!dbUser?.walletAddress?.startsWith("0x")) {
      return error("Link a wallet first", 400);
    }

    const existing = await prisma.userAchievement.findFirst({
      where: { claimTxHash: txHash, NOT: { id: ua.id } },
    });
    if (existing) return error("Transaction already used for another claim", 409);

    const verified = await verifyOnChainClaim({
      txHash,
      userId: auth.id,
      achievementId: body.achievementId,
      expectedWallet: dbUser.walletAddress as `0x${string}`,
      expectedAmount: ua.achievement.rewardTokens,
    });
    if (!verified.ok) return error(verified.reason, 400);

    await prisma.userAchievement.update({
      where: { id: ua.id },
      data: { claimedAt: new Date(), claimTxHash: txHash },
    });

    return json({ ok: true, txHash });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Confirm failed", 500);
  }
}
