import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { getOwnedStation, getTierMeta } from "@/lib/stations";
import {
  parseStationScheduleCsv,
  applyStationScheduleImport,
} from "@/lib/schedule-import";
import { z } from "zod";

const schema = z.object({
  csv: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const station = await getOwnedStation(auth.id);
  if (!station) return error("No station owned by this account", 404);

  try {
    const body = schema.parse(await request.json());
    const parsed = parseStationScheduleCsv(body.csv);
    if (parsed.rows.length === 0) {
      return error(parsed.errors[0] ?? "No valid rows in CSV", 400);
    }

    const tierMeta = getTierMeta(station.tier);
    const result = await applyStationScheduleImport(
      station.id,
      parsed.rows,
      tierMeta.maxResidents,
    );

    return json({
      applied: result.applied,
      skipped: result.skipped,
      parseErrors: parsed.errors,
      imported: result.applied.length,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("CSV content required");
    console.error("schedule import:", e);
    return error("Import failed", 500);
  }
}
