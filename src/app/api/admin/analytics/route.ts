import { json, isApiError } from "@/lib/api-utils";
import { requireAdminApi } from "@/lib/admin";
import { getAdminAnalytics } from "@/lib/admin-analytics";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const analytics = await getAdminAnalytics();
  return json(analytics);
}
