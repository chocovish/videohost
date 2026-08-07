import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@videohost/db";

export async function POST(req: Request) {
  try {
    const { name, email, password, orgName } = await req.json();

    if (!email || !password || !orgName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Math.random().toString(36).substring(2, 6);

    // Get default free plan
    let freePlan = await db.plan.findUnique({ where: { id: "plan_free" } });
    if (!freePlan) {
      freePlan = await db.plan.create({
        data: {
          id: "plan_free",
          name: "free",
          minutesLimit: 200,
          maxResolution: "1080p",
          seatLimit: 5,
          priceMonthlyCents: 0,
          isCustom: false,
        },
      });
    }

    // Transaction to create User, Org & Member
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          planId: freePlan.id,
          themeId: "lime",
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return { user, organization };
    });

    return NextResponse.json({ success: true, orgId: result.organization.id });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
