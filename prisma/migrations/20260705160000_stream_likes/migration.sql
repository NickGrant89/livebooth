-- Stream likes (one per user per stream)
CREATE TABLE "StreamLike" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StreamLike_streamId_userId_key" ON "StreamLike"("streamId", "userId");
CREATE INDEX "StreamLike_streamId_idx" ON "StreamLike"("streamId");
CREATE INDEX "StreamLike_userId_idx" ON "StreamLike"("userId");

ALTER TABLE "StreamLike" ADD CONSTRAINT "StreamLike_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StreamLike" ADD CONSTRAINT "StreamLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
