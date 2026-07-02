/**
 * Promote an existing user to platform admin.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/promote-admin.ts your@email.com
 *   DATABASE_URL="postgresql://..." npx tsx scripts/promote-admin.ts digital89
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/create-prisma-client";

async function main() {
  const identifier = process.argv[2]?.trim().toLowerCase();
  if (!identifier) {
    console.error("Usage: npx tsx scripts/promote-admin.ts <email-or-username>");
    process.exit(1);
  }

  const prisma = createPrismaClient();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier.replace(/@.*/, "") }],
    },
    select: { id: true, username: true, email: true, role: true },
  });

  if (!user) {
    console.error(`No user found for "${identifier}". Sign up on the site first, then rerun.`);
    process.exit(1);
  }

  if (user.role === "admin") {
    console.log(`Already admin: @${user.username} (${user.email})`);
    console.log("Sign in at /login?next=/admin");
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "admin" },
  });

  console.log(`✓ Promoted @${user.username} (${user.email}) to admin`);
  console.log("Open https://livebooth.uk/login?next=/admin (or /login?next=/admin locally)");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
