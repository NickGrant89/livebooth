import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl, isPostgresDatabaseUrl, isSqliteDatabaseUrl } from "./database-url";

const LOCAL_POSTGRES =
  "postgresql://livebooth:livebooth@localhost:5432/livebooth";

/**
 * Prisma schema uses provider `postgresql` — only the pg driver adapter is valid.
 */
export function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();

  if (isSqliteDatabaseUrl(url)) {
    throw new Error(
      `DATABASE_URL is SQLite (${url}) but this app now uses PostgreSQL. ` +
        `Update .env to:\nDATABASE_URL="${LOCAL_POSTGRES}"\n` +
        `Then run: npm run db:up && npm run db:migrate:deploy`,
    );
  }

  if (!isPostgresDatabaseUrl(url)) {
    throw new Error(
      `Unsupported DATABASE_URL. Use postgresql://… Got: ${url.split(":")[0]}:`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg") as typeof import("pg");
  const pool = new Pool({
    connectionString: url,
    max: process.env.VERCEL ? 1 : 10,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
