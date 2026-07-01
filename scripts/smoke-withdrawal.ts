/**
 * Smoke test withdrawal MVP (lib layer, no HTTP).
 * Usage: npm run smoke:withdrawal
 */
import { prisma } from "../src/lib/db";
import {
  requestWithdrawal,
  adminUpdateWithdrawal,
  listAdminWithdrawals,
} from "../src/lib/withdrawals";

async function main() {
  const dj = await prisma.user.findUnique({ where: { username: "neonpulse" } });
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!dj || !admin) throw new Error("Seed users missing — run npm run demo:fresh");

  const balance = await prisma.beatBalance.findUnique({ where: { userId: dj.id } });
  console.log(`neonpulse balance: ${balance?.balance ?? 0} DROP`);

  // Clear prior pending requests for clean smoke
  await prisma.withdrawalRequest.deleteMany({
    where: { userId: dj.id, status: { in: ["pending", "approved"] } },
  });

  const req = await requestWithdrawal(dj.id, 50);
  if (!req.ok) {
    console.error("Request failed:", req.error);
    process.exit(1);
  }
  console.log("✓ Request created:", req.request.id, req.request.status);

  const pending = await listAdminWithdrawals("pending");
  const mine = pending.find((r) => r.id === req.request.id);
  if (!mine) throw new Error("Not in admin queue");
  console.log("✓ Visible in admin queue");

  const approved = await adminUpdateWithdrawal(req.request.id, admin.id, "approve");
  if (!approved.ok) throw new Error(approved.error);
  console.log("✓ Approved:", approved.request.status);

  const paid = await adminUpdateWithdrawal(req.request.id, admin.id, "mark_paid");
  if (!paid.ok) throw new Error(paid.error);
  console.log("✓ Marked paid:", paid.request.status);

  console.log("\nWithdrawal MVP smoke passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
