import { json, isApiError } from "@/lib/api-utils";
import { requireModeratorPermissionApi, getAdminStats, getModeratorStats } from "@/lib/admin";
import { isFullAdminRole } from "@/lib/staff-roles";
import { evaluateAllLiveStreams } from "@/lib/moderation";

export async function GET(request: Request) {
  const staff = await requireModeratorPermissionApi(request, "overview");
  if (isApiError(staff)) return staff;

  await evaluateAllLiveStreams();
  const stats = await getAdminStats();
  if (!isFullAdminRole(staff.role)) {
    return json({ ...getModeratorStats(stats), staffRole: staff.role });
  }
  return json({ ...stats, staffRole: staff.role });
}
