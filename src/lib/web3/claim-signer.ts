import { WalletClient, keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export function getClaimSignerKey(): `0x${string}` | null {
  const key = process.env.CLAIM_SIGNER_PRIVATE_KEY;
  if (!key?.startsWith("0x") || key.length !== 66) return null;
  return key as `0x${string}`;
}

export function achievementClaimId(userId: string, achievementId: string): `0x${string}` {
  return keccak256(encodeAbiParameters(parseAbiParameters("string, string"), [userId, achievementId]));
}

export async function signAchievementClaim(
  userAddress: `0x${string}`,
  claimId: `0x${string}`,
  amountWei: bigint,
  deadline: bigint,
): Promise<`0x${string}` | null> {
  const key = getClaimSignerKey();
  if (!key) return null;

  const account = privateKeyToAccount(key);
  const claimHash = keccak256(
    encodeAbiParameters(
      parseAbiParameters("address, bytes32, uint256, uint256"),
      [userAddress, claimId, amountWei, deadline],
    ),
  );

  return account.signMessage({ message: { raw: claimHash } });
}

export async function waitForTx(client: WalletClient, hash: `0x${string}`) {
  if (!client) return;
  // viem public client would be better; callers use wagmi waitForTransactionReceipt
  return hash;
}
