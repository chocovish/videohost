import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrganizationUsage } from "@/lib/usage";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || !session.user || !(session as any).organizationId) {
    redirect("/login");
  }

  const orgName = (session as any).organizationName || "My Organization";
  const userEmail = session.user.email || "";
  const userName = session.user.name || undefined;
  const role = (session as any).role || "MEMBER";
  const orgId = (session as any).organizationId;
  const themeId = (session as any).themeId || "lime";

  let usageMinutes = 0;
  let minutesLimit = 200;

  try {
    const usage = await getOrganizationUsage(orgId);
    usageMinutes = usage.usedMinutes;
    minutesLimit = usage.minutesLimit;
  } catch (e) {
    console.error("Error fetching usage in layout:", e);
  }

  return (
    <div className="min-h-screen flex bg-[hsl(var(--background))]">
      <Sidebar
        organizationName={orgName}
        usageMinutes={usageMinutes}
        minutesLimit={minutesLimit}
        currentTheme={themeId}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          userEmail={userEmail}
          userName={userName}
          role={role}
          organizationName={orgName}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
