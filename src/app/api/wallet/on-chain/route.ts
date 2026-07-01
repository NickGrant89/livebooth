import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { contractsConfigured, CONTRACTS } from "@/lib/web3/contracts";

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { walletAddress: true, role: true },
  });
  if (!user) return error("Not found", 404);

  return json({
    contractsConfigured: contractsConfigured(),
    chainId: CONTRACTS.chainId,
    dropToken: contractsConfigured() ? CONTRACTS.dropToken : null,
    tipRouter: contractsConfigured() ? CONTRACTS.tipRouter : null,
    linkedAddress: user.walletAddress,
    canReceiveOnChainTips:
      (user.role === "dj" || user.role === "admin") &&
      Boolean(user.walletAddress?.startsWith("0x")),
  });
}
