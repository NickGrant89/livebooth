/**
 * Pre-deploy readiness check.
 * Usage: npm run launch:check
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const REQUIRED_PROD = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

const RECOMMENDED_PROD = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "LIVEPEER_API_KEY",
  "LIVEPEER_WEBHOOK_SECRET",
] as const;

const NEVER_PROD = ["NEXT_PUBLIC_DEMO_MODE", "SEED_DEMO_USERS"] as const;

function loadEnvFile(): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(".env")) return out;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function main() {
  console.log("\n🚀 LiveBooth launch check\n");

  let failed = false;

  // Migrations folder
  const migrations = "prisma/migrations";
  if (!existsSync(migrations)) {
    console.error("✗ Missing prisma/migrations");
    failed = true;
  } else {
    console.log("✓ Postgres migrations present");
  }

  // Build (quick — prisma generate only if build too slow; user can run full build)
  try {
    execSync("npx prisma generate", { stdio: "pipe" });
    console.log("✓ prisma generate OK");
  } catch {
    console.error("✗ prisma generate failed");
    failed = true;
  }

  const env = { ...loadEnvFile(), ...process.env };

  console.log("\n--- Production env (set these on Vercel) ---\n");
  for (const key of REQUIRED_PROD) {
    const val = env[key];
    if (!val || val.includes("localhost") && key === "NEXT_PUBLIC_APP_URL") {
      console.log(`⚠ ${key} — required (use Neon URL + https://livebooth.uk)`);
    } else if (key === "AUTH_SECRET" && (val.includes("dev") || val.includes("change-me") || val.length < 24)) {
      console.log(`⚠ ${key} — rotate before production`);
      console.log(`  Suggested: ${randomBytes(32).toString("base64")}`);
    } else {
      console.log(`✓ ${key} set locally`);
    }
  }

  for (const key of RECOMMENDED_PROD) {
    console.log(env[key] ? `✓ ${key}` : `○ ${key} — recommended for full features`);
  }

  console.log("\n--- Do NOT set on production ---\n");
  for (const key of NEVER_PROD) {
    if (env[key] === "true") {
      console.log(`✗ ${key}=true — remove for production`);
      failed = true;
    } else {
      console.log(`✓ ${key} not enabled`);
    }
  }

  console.log("\n--- Next steps ---\n");
  console.log("1. Register livebooth.uk (or your domain)");
  console.log("2. Create Neon project → copy pooled DATABASE_URL");
  console.log("3. Push repo to GitHub → import in vercel.com");
  console.log("4. Set env vars → Deploy");
  console.log("5. SMOKE_BASE_URL=https://your-app.vercel.app npm run smoke:deploy");
  console.log("6. Point DNS to Vercel → set NEXT_PUBLIC_APP_URL to https://livebooth.uk");
  console.log("7. Seed admin: SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... DATABASE_URL=... npm run db:seed");
  console.log("\nDocs: docs/PRODUCTION-DEPLOY.md · docs/SOFT-LAUNCH.md\n");

  if (failed) process.exit(1);
  console.log("✅ Ready for deploy setup (complete Vercel/Neon steps above).\n");
}

main();
