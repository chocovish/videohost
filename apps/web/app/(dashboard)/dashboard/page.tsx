import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const queryString = new URLSearchParams(
    Object.entries(params || {}).flatMap(([key, val]) =>
      Array.isArray(val) ? val.map((v) => [key, v]) : val !== undefined ? [[key, val]] : []
    )
  ).toString();

  const querySuffix = queryString ? `?${queryString}` : "";

  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  let viewMode = (session.user as any)?.viewMode || "CREATOR";
  try {
    const userDb = await db.user.findUnique({
      where: { id: session.user.id },
      select: { viewMode: true },
    });
    if (userDb?.viewMode) {
      viewMode = userDb.viewMode;
    }
  } catch (e) {
    console.error("Error fetching viewMode in /dashboard page redirect:", e);
  }

  if (viewMode === "VIEWER") {
    redirect(`/dashboard/shared-with-you${querySuffix}`);
  } else {
    redirect(`/dashboard/uploaded-videos${querySuffix}`);
  }
}
