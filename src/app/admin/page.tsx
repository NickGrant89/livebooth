import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  isStaffRole,
  isFullAdminRole,
  parseModeratorPermissions,
  DEFAULT_MODERATOR_PERMISSIONS,
} from "@/lib/staff-roles";
import { isEmailConfigured } from "@/lib/email";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!isStaffRole(user.role)) return <AdminAccessDenied role={user.role} />;

  const isFullAdmin = isFullAdminRole(user.role);
  let moderatorPermissions = DEFAULT_MODERATOR_PERMISSIONS;

  if (!isFullAdmin) {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { moderatorPermissions: true },
    });
    moderatorPermissions = parseModeratorPermissions(row?.moderatorPermissions);
  }

  return (
    <AdminDashboard
      isFullAdmin={isFullAdmin}
      moderatorPermissions={moderatorPermissions}
      emailConfigured={isEmailConfigured()}
    />
  );
}
