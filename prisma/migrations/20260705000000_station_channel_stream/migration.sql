-- Station-owned video live channel (st_ ingest keys)
ALTER TABLE "Stream" ADD COLUMN "stationChannel" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Stream_stationChannel_status_idx" ON "Stream"("stationId", "stationChannel", "status");
