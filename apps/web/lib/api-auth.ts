import { auth } from "@/lib/auth";
import { verifyApiKey } from "@/lib/api-keys";
import { db } from "@videohost/db";

export interface AuthContext {
  orgId: string;
  userId: string;
  role: string;
  isApiKey: boolean;
}

export async function authenticateRequest(req: Request): Promise<AuthContext | null> {
  // 1. Try Bearer API key header first
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const keyRecord = await verifyApiKey(token);
    if (keyRecord) {
      const user = await db.user.findUnique({
        where: { id: keyRecord.createdById },
        select: { isBlocked: true },
      });
      if (user?.isBlocked) {
        return null;
      }

      return {
        orgId: keyRecord.organizationId,
        userId: keyRecord.createdById,
        role: "ADMIN",
        isApiKey: true,
      };
    }
  }

  // 2. Fall back to NextAuth session
  const session = await auth();
  if (session && session.user && session.user.id && (session as any).organizationId) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { isBlocked: true },
    });
    if (user?.isBlocked) {
      return null;
    }

    return {
      orgId: (session as any).organizationId as string,
      userId: session.user.id as string,
      role: ((session as any).role as string) || "MEMBER",
      isApiKey: false,
    };
  }

  return null;
}

