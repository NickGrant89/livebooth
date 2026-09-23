-- Track last time RTMP/HLS ingest was healthy (for auto-end when OBS stops)
ALTER TABLE "Stream" ADD COLUMN "ingestLastSeenAt" TIMESTAMP(3);
