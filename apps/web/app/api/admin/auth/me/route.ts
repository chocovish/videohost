import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await isUserAdmin();
  return NextResponse.json({
    authenticated: isAdmin,
    role: isAdmin ? "SUPER_ADMIN" : null,
  });
}
