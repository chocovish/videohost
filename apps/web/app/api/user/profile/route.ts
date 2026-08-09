import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: authCtx.userId },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        accounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPassword = Boolean(user.passwordHash);
    const isGoogleAccount = user.accounts.some((acc) => acc.provider === "google");

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        hasPassword,
        isGoogleAccount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/user/profile error:", error);
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, currentPassword, newPassword } = body;

    const user = await db.user.findUnique({
      where: { id: authCtx.userId },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: { name?: string; passwordHash?: string } = {};

    // 1. Handle Name Update
    if (typeof name === "string") {
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = trimmedName;
    }

    // 2. Handle Password Update / Reset
    if (typeof newPassword === "string" && newPassword.length > 0) {
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters long" },
          { status: 400 }
        );
      }

      const hasExistingPassword = Boolean(user.passwordHash);

      if (hasExistingPassword) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: "Current password is required to change password" },
            { status: 400 }
          );
        }

        const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash!);
        if (!isCurrentValid) {
          return NextResponse.json(
            { error: "Current password is incorrect" },
            { status: 400 }
          );
        }
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10);
      updateData.passwordHash = newHash;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        hasPassword: Boolean(updatedUser.passwordHash),
      },
    });
  } catch (error: any) {
    console.error("PATCH /api/user/profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
