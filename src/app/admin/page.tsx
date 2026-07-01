import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") return <AdminAccessDenied role={user.role} />;

  return <AdminDashboard />;
}
