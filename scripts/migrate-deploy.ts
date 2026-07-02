/**
 * Run prisma migrate deploy with the correct Postgres URL.
 * On Vercel/Neon, DIRECT_URL (non-pooled) is required — the pooler cannot hold advisory locks (P1002).
 */
import { execSync } from "child_process";

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function migrateUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  const pooled = process.env.DATABASE_URL?.trim();

  if (process.env.VERCEL === "1" && !direct) {
    console.error(`
❌ DIRECT_URL is missing on Vercel.

Prisma migrate deploy needs Neon's **direct** connection (no "-pooler" in the hostname).
Without it, builds fail with P1002 advisory lock timeout.

Fix:
1. Neon Console → Connect → copy the **direct** connection string
2. Vercel → Settings → Environment Variables → add DIRECT_URL
3. Redeploy (cancel any other in-progress deploys first)

Example:
  DATABASE_URL = postgresql://...@ep-xxx-pooler.eu-west-2.aws.neon.tech/...
  DIRECT_URL   = postgresql://...@ep-xxx.eu-west-2.aws.neon.tech/...
`);
    process.exit(1);
  }

  const url = direct || pooled;
  if (!url) {
    console.error("DATABASE_URL is required for prisma migrate deploy");
    process.exit(1);
  }

  if (direct && pooled && direct !== pooled) {
    console.log("Using DIRECT_URL for prisma migrate deploy");
  }

  return url;
}

const url = migrateUrl();
process.env.DATABASE_URL = url;

const maxAttempts = 3;
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: process.env,
    });
    process.exit(0);
  } catch {
    if (attempt >= maxAttempts) {
      console.error(`
❌ prisma migrate deploy failed after ${maxAttempts} attempts.

If you see P1002 (advisory lock timeout):
- Confirm DIRECT_URL is set (no -pooler)
- Cancel duplicate Vercel deploys — only one migrate at a time
- Run once locally: DIRECT_URL="..." npx prisma migrate deploy
`);
      process.exit(1);
    }
    console.warn(`migrate deploy attempt ${attempt} failed — retrying in 8s…`);
    sleep(8000);
  }
}
