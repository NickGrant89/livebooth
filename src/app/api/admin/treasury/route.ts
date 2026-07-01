import { json, isApiError } from "@/lib/api-utils";
import { requireAdminApi } from "@/lib/admin";
import { getTreasuryStats } from "@/lib/treasury";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const stats = await getTreasuryStats();
  return json(stats);
}
