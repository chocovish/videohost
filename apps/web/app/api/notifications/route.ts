import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";

// GET /api/notifications?filter=all|unread&limit=20
// Returns the viewer's notifications + unread count + pending reschedule action count.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;
  const searchParams = req.nextUrl.searchParams;
  const filter = searchParams.get("filter") || "all";
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);

  try {
    const where: any = { userId };
    if (filter === "unread") where.isRead = false;

    const userRecord = await db.user.findUnique({ where: { id: userId }, select: { email: true } }).catch(() => null);
    const userEmail = userRecord?.email?.toLowerCase().trim();

    const [notifications, unreadCount, pendingActionCount] = await Promise.all([
      (db as any).notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      (db as any).notification.count({ where: { userId, isRead: false } }),
      // Reschedule requests where this user is the OTHER party (needs their action)
      (db as any).appointmentRescheduleRequest.count({
        where: {
          status: "PENDING",
          OR: [
            // User is host-side and request came from client
            {
              proposedByRole: "CLIENT",
              appointment: {
                OR: [
                  { hostId: userId },
                  { organization: { members: { some: { userId } } } },
                ],
              },
            },
            // User is client-side and request came from host
            {
              proposedByRole: "HOST",
              appointment: {
                OR: [{ clientId: userId }, ...(userEmail ? [{ clientEmail: userEmail }] : [])],
              },
            },
          ],
        },
      }).catch(() => 0),
    ]);

    return NextResponse.json({ notifications, unreadCount, pendingActionCount });
  } catch (error: any) {
    console.error("[GET /api/notifications Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch notifications" }, { status: 500 });
  }
}

// PATCH /api/notifications — { ids?: string[], markAllRead?: boolean }
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.markAllRead) {
      await (db as any).notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }
    const ids: string[] = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "ids or markAllRead required" }, { status: 400 });
    }
    await (db as any).notification.updateMany({
      where: { userId, id: { in: ids } },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PATCH /api/notifications Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to update notifications" }, { status: 500 });
  }
}
