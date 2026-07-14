import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole, isFullAdminRole } from "@/lib/staff-roles";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!isStaffRole(user.role)) return <AdminAccessDenied role={user.role} />;

  return <AdminDashboard isFullAdmin={isFullAdminRole(user.role)} />;
}
