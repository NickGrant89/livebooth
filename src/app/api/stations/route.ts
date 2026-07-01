import { json } from "@/lib/api-utils";
import { fetchPublicStations } from "@/lib/stations-discover";

export async function GET() {
  const stations = await fetchPublicStations(48);
  return json({ stations });
}
