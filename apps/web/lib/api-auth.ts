import { auth } from "@/lib/auth";
import { verifyApiKey } from "@/lib/api-keys";

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
    return {
      orgId: (session as any).organizationId as string,
      userId: session.user.id as string,
      role: ((session as any).role as string) || "MEMBER",
      isApiKey: false,
    };
  }

  return null;
}
