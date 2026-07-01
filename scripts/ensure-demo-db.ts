/**
 * Ensures Docker Postgres is migrated and demo users exist.
 * Usage: npm run demo:ensure-db
 */
import { execSync } from "node:child_process";
import { createPrismaClient } from "../src/lib/create-prisma-client";

import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function run(cmd: string) {
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

async function main() {
  const url =
    process.env.DATABASE_URL ??
    "postgresql://livebooth:livebooth@localhost:5432/livebooth";

  if (!url.startsWith("postgres")) {
    console.error("DATABASE_URL must be PostgreSQL. Update .env and retry.");
    process.exit(1);
  }

  try {
    run("docker compose up -d postgres");
    run("npm run db:wait");
  } catch {
    console.warn("Docker Postgres not started — assuming DATABASE_URL is reachable.");
  }

  run("npx prisma migrate deploy");

  const prisma = createPrismaClient();
  const count = await prisma.user.count();
  if (count === 0) {
    console.log("Empty database — seeding demo users…");
    run("SEED_DEMO_USERS=true npx tsx prisma/seed.ts");
  } else {
    console.log(`Database OK (${count} users).`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
