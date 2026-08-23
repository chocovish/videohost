import { NextResponse } from "next/server";
import {
  requireAdminApi,
  IMPERSONATION_COOKIE_NAME,
} from "@/lib/admin-auth";

export async function POST() {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const response = NextResponse.json({
      success: true,
      message: "Impersonation session terminated successfully",
      redirect: "/admin",
    });

    // Clear impersonation cookie
    response.cookies.set(IMPERSONATION_COOKIE_NAME, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    // Clear NextAuth session token cookies
    response.cookies.set("authjs.session-token", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    response.cookies.set("__Secure-authjs.session-token", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    // Also clear next-auth legacy cookie name just in case
    response.cookies.set("next-auth.session-token", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error: any) {
    console.error("[API /api/admin/impersonate/stop Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to stop impersonation" },
      { status: 500 }
    );
  }
}
