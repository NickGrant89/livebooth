/**
 * Sprint 4 deploy smoke — health + DB connectivity.
 * Usage: SMOKE_BASE_URL=https://your-app.vercel.app npm run smoke:deploy
 */
const BASE = (process.env.SMOKE_BASE_URL ?? "http://localhost:3008").replace(/\/$/, "");

async function main() {
  console.log("LiveBooth deploy smoke →", BASE);

  const res = await fetch(`${BASE}/api/health`);
  const data = (await res.json()) as {
    ok?: boolean;
    database?: { ok?: boolean; provider?: string; error?: string };
    contractsConfigured?: boolean;
  };

  if (!res.ok) {
    console.error("Health check failed:", res.status, data);
    process.exit(1);
  }

  if (!data.ok) {
    console.error("Service unhealthy:", data);
    process.exit(1);
  }

  console.log("✓ /api/health OK");
  console.log(`  database: ${data.database?.provider} (${data.database?.ok ? "connected" : "down"})`);
  console.log(`  contracts: ${data.contractsConfigured ? "configured" : "not set"}`);
  console.log("\n✅ Deploy smoke passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
