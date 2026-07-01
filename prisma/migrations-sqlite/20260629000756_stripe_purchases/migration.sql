-- CreateTable
CREATE TABLE "StripePurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "dropAmount" REAL NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "StripePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StripePurchase_stripeSessionId_key" ON "StripePurchase"("stripeSessionId");

-- CreateIndex
CREATE INDEX "StripePurchase_userId_idx" ON "StripePurchase"("userId");
