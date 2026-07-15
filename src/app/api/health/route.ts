import { prisma } from "@/lib/db";
import { isOnChainEnabled, onChainFeaturesAvailable } from "@/lib/web3/contracts";
import { getDatabaseUrl, isPostgresDatabaseUrl, isSqliteDatabaseUrl } from "@/lib/database-url";
import { json } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = getDatabaseUrl();
  let dbOk = false;
  let dbError: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Database unreachable";
  }

  const healthy = dbOk;

  return json(
    {
      ok: healthy,
      service: "livebooth",
      database: {
        ok: dbOk,
        provider: isPostgresDatabaseUrl(url)
          ? "postgresql"
          : isSqliteDatabaseUrl(url)
            ? "sqlite"
            : "unknown",
        error: dbError,
      },
      onChainEnabled: isOnChainEnabled(),
      onChainFeaturesAvailable: onChainFeaturesAvailable(),
      contractsConfigured: onChainFeaturesAvailable(),
      timestamp: new Date().toISOString(),
    },
    healthy ? 200 : 503,
  );
}
