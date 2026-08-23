import { redirect } from "next/navigation";
import { isUserAdmin } from "@/lib/admin-auth";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Control Center | Taped",
  description: "Administrative command center for platform moderation, subscription tiers, and payouts.",
};

export default async function AdminPage() {
  const isAdmin = await isUserAdmin();

  if (!isAdmin) {
    redirect("/admin/login");
  }

  return <AdminDashboardClient />;
}
