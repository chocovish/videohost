import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrganizationUsage } from "@/lib/usage";
import { db } from "@videohost/db";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/SidebarContext";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || !session.user || !(session as any).organizationId) {
    redirect("/auth/login");
  }

  const userEmail = session.user.email || "";
  let userName = session.user.name || undefined;
  let userImage = session.user.image || undefined;
  const role = (session as any).role || "MEMBER";
  const orgId = (session as any).organizationId;
  const themeId = (session as any).themeId || "lime";

  let orgName = (session as any).organizationName || "My Organization";

  let viewMode = (session.user as any)?.viewMode || "CREATOR";

  try {
    const userDb = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, image: true, viewMode: true },
    });
    if (userDb?.name) {
      userName = userDb.name;
    }
    if (userDb?.image) {
      userImage = userDb.image;
    }
    if (userDb?.viewMode) {
      viewMode = userDb.viewMode;
    }
  } catch (e) {
    console.error("Error fetching user details in layout:", e);
  }

  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    if (org?.name) {
      orgName = org.name;
    }
  } catch (e) {
    console.error("Error fetching organization name in layout:", e);
  }

  let usedBytes = 0;
  let storageLimitBytes = 2 * 1024 * 1024 * 1024;
  let storageLimitGb = 2;

  try {
    const usage = await getOrganizationUsage(orgId);
    usedBytes = usage.usedBytes;
    storageLimitBytes = usage.storageLimitBytes;
    storageLimitGb = usage.storageLimitGb;
  } catch (e) {
    console.error("Error fetching usage in layout:", e);
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex bg-[hsl(var(--background))] overflow-hidden">
        <Sidebar
          organizationName={orgName}
          usedBytes={usedBytes}
          storageLimitBytes={storageLimitBytes}
          storageLimitGb={storageLimitGb}
          currentTheme={themeId}
          initialViewMode={viewMode}
        />
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Navbar
            userEmail={userEmail}
            userName={userName}
            userImage={userImage}
            role={role}
            organizationName={orgName}
          />
          <div className="flex-1 overflow-y-auto w-full">
            <main className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
