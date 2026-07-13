import { decodeEventLog, type Hash } from "viem";
import { achievementClaimId } from "./claim-signer";
import { ABIS, CONTRACTS, parseDrop } from "./contracts";
import { createVeChainPublicClient, sleep } from "./public-client";

export async function verifyOnChainClaim(params: {
  txHash: Hash;
  userId: string;
  achievementId: string;
  expectedWallet: `0x${string}`;
  expectedAmount: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!CONTRACTS.achievementVault) {
    return { ok: false, reason: "AchievementVault not configured" };
  }

  const client = createVeChainPublicClient();
  const expectedClaimId = achievementClaimId(params.userId, params.achievementId);
  const expectedAmountWei = parseDrop(params.expectedAmount);
  const walletLower = params.expectedWallet.toLowerCase();

  let receipt = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      receipt = await client.getTransactionReceipt({ hash: params.txHash });
      if (receipt) break;
    } catch {
      /* indexing lag */
    }
    await sleep(attempt === 0 ? 500 : 1500);
  }

  if (!receipt) {
    return { ok: false, reason: "Transaction receipt not found yet — try again in a few seconds" };
  }
  if (receipt.status !== "success") {
    return { ok: false, reason: "Transaction failed on-chain" };
  }

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CONTRACTS.achievementVault.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: ABIS.achievementVault,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "RewardClaimed") continue;
      const args = decoded.args as unknown as {
        user: `0x${string}`;
        claimId: `0x${string}`;
        amount: bigint;
      };
      if (args.user.toLowerCase() !== walletLower) continue;
      if (args.claimId !== expectedClaimId) {
        return { ok: false, reason: "Claim id does not match achievement" };
      }
      if (args.amount !== expectedAmountWei) {
        return { ok: false, reason: "Claim amount does not match transaction" };
      }
      return { ok: true };
    } catch {
      continue;
    }
  }

  return { ok: false, reason: "No matching RewardClaimed event found for this achievement" };
}
