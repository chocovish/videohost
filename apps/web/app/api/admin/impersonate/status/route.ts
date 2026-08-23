import { NextResponse } from "next/server";
import { getImpersonationSession } from "@/lib/admin-auth";

export async function GET() {
  try {
    const impersonation = await getImpersonationSession();
    if (!impersonation) {
      return NextResponse.json({
        isImpersonating: false,
      });
    }

    return NextResponse.json({
      isImpersonating: true,
      user: {
        id: impersonation.targetUserId,
        name: impersonation.targetUserName,
        email: impersonation.targetUserEmail,
        image: impersonation.targetUserImage,
      },
      startedAt: impersonation.startedAt,
    });
  } catch (error: any) {
    console.error("[API /api/admin/impersonate/status Error]:", error);
    return NextResponse.json(
      { isImpersonating: false, error: error.message },
      { status: 500 }
    );
  }
}
