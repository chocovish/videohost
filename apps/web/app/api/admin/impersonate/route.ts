import { NextResponse } from "next/server";
import {
  requireAdminApi,
  createImpersonationToken,
  encodeNextAuthSession,
  IMPERSONATION_COOKIE_NAME,
} from "@/lib/admin-auth";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (targetUser.isBlocked) {
      return NextResponse.json(
        { error: "Cannot impersonate a blocked user account. Please unblock the account first." },
        { status: 400 }
      );
    }

    // Ensure the target user has an organization workspace
    if (targetUser.memberships.length === 0) {
      try {
        let defaultPlan = await db.plan.findFirst({ where: { name: "free" } });
        if (!defaultPlan) {
          defaultPlan = await db.plan.create({
            data: {
              name: "free",
              minutesLimit: 200,
              maxResolution: "1080p",
              seatLimit: 3,
              priceMonthlyCents: 0,
            },
          });
        }

        const userName = targetUser.name || targetUser.email?.split("@")[0] || "User";
        const orgName = `${userName}'s Workspace`;
        const baseSlug = userName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "workspace";
        const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

        const newOrg = await db.organization.create({
          data: {
            name: orgName,
            slug,
            planId: defaultPlan.id,
            members: {
              create: {
                userId: targetUser.id,
                role: "OWNER",
              },
            },
          },
        });

        await db.user.update({
          where: { id: targetUser.id },
          data: { activeOrganizationId: newOrg.id },
        });
      } catch (err) {
        console.error("Error creating default workspace during impersonation:", err);
      }
    }

    // 1. Create Admin Impersonation signed token
    const impersonationToken = createImpersonationToken({
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      targetUserEmail: targetUser.email,
      targetUserImage: targetUser.image,
    });

    // 2. Generate NextAuth / Auth.js encrypted session token
    const standardSessionToken = await encodeNextAuthSession(
      targetUser,
      "authjs.session-token"
    );
    const secureSessionToken = await encodeNextAuthSession(
      targetUser,
      "__Secure-authjs.session-token"
    );

    const isSecure =
      process.env.NODE_ENV === "production" &&
      !process.env.NEXTAUTH_URL?.startsWith("http://localhost");

    const maxAge = 60 * 60 * 24 * 7; // 7 days

    const response = NextResponse.json({
      success: true,
      message: `Impersonation started for ${targetUser.name || targetUser.email || targetUser.id}`,
      redirect: "/dashboard",
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        image: targetUser.image,
      },
    });

    // Set impersonation tracker cookie
    response.cookies.set(IMPERSONATION_COOKIE_NAME, impersonationToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    // Set standard NextAuth session token
    response.cookies.set("authjs.session-token", standardSessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    // Set secure NextAuth session token if in production/secure
    if (isSecure) {
      response.cookies.set("__Secure-authjs.session-token", secureSessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge,
      });
    }

    return response;
  } catch (error: any) {
    console.error("[API /api/admin/impersonate Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start user impersonation" },
      { status: 500 }
    );
  }
}
