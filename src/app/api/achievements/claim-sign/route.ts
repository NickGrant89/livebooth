import { achievementClaimId, signAchievementClaim } from "@/lib/web3/claim-signer";
import { isOnChainEnabled, parseDrop } from "@/lib/web3/contracts";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (!isOnChainEnabled()) {
    return error("On-chain features are disabled", 503);
  }

  const { achievementId } = (await request.json()) as { achievementId: string };
  if (!achievementId) return error("achievementId required");

  const ua = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId: auth.id, achievementId } },
    include: { achievement: true },
  });
  if (!ua?.unlockedAt) return error("Achievement not unlocked", 400);
  if (ua.claimedAt) return error("Already claimed", 400);

  const dbUser = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!dbUser?.walletAddress?.startsWith("0x")) {
    return error("Link a wallet first", 400);
  }

  const claimId = achievementClaimId(auth.id, achievementId);
  const amount = ua.achievement.rewardTokens;
  const amountWei = parseDrop(amount);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  const signature = await signAchievementClaim(
    dbUser.walletAddress as `0x${string}`,
    claimId,
    amountWei,
    deadline,
  );
  if (!signature) return error("Claim signing not configured", 503);

  return json({
    claimId,
    amount,
    amountWei: amountWei.toString(),
    deadline: deadline.toString(),
    signature,
  });
}
