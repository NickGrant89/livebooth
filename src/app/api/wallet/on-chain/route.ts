import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { CONTRACTS, isOnChainEnabled, onChainFeaturesAvailable } from "@/lib/web3/contracts";

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { walletAddress: true, role: true },
  });
  if (!user) return error("Not found", 404);

  return json({
    onChainEnabled: isOnChainEnabled(),
    contractsConfigured: onChainFeaturesAvailable(),
    chainId: CONTRACTS.chainId,
    dropToken: onChainFeaturesAvailable() ? CONTRACTS.dropToken : null,
    tipRouter: onChainFeaturesAvailable() ? CONTRACTS.tipRouter : null,
    linkedAddress: user.walletAddress,
    canReceiveOnChainTips:
      onChainFeaturesAvailable() &&
      (user.role === "dj" || user.role === "admin") &&
      Boolean(user.walletAddress?.startsWith("0x")),
  });
}
