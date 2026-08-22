import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@videohost/db";

export async function GET(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bankAccount = await db.bankAccount.findUnique({
      where: { organizationId: authCtx.orgId },
    });

    return NextResponse.json({
      success: true,
      bankAccount,
    });
  } catch (err: any) {
    console.error("[GET /api/organization/bank-account Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch bank account" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      accountHolderName,
      accountNumber,
      routingNumber,
      bankName,
      swiftCode,
      accountType = "CHECKING",
      country = "US",
      currency = "USD",
    } = body;

    if (!accountHolderName || !accountNumber || !bankName) {
      return NextResponse.json(
        { error: "Account Holder Name, Account Number, and Bank Name are required." },
        { status: 400 }
      );
    }

    const bankAccount = await db.bankAccount.upsert({
      where: { organizationId: authCtx.orgId },
      create: {
        organizationId: authCtx.orgId,
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        routingNumber: routingNumber ? routingNumber.trim() : null,
        bankName: bankName.trim(),
        swiftCode: swiftCode ? swiftCode.trim() : null,
        accountType,
        country,
        currency,
      },
      update: {
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        routingNumber: routingNumber ? routingNumber.trim() : null,
        bankName: bankName.trim(),
        swiftCode: swiftCode ? swiftCode.trim() : null,
        accountType,
        country,
        currency,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bank account details saved successfully.",
      bankAccount,
    });
  } catch (err: any) {
    console.error("[POST /api/organization/bank-account Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to save bank account" }, { status: 500 });
  }
}
