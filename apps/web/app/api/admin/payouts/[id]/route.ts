import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { db } from "@videohost/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, transactionId, transactionProof, adminNotes } = body;

    const validStatuses = ["PENDING", "PROCESSING", "COMPLETED", "REJECTED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const payout = await db.withdrawalRequest.findUnique({
      where: { id },
      include: {
        organization: true,
        requestedBy: true,
      },
    });

    if (!payout) {
      return NextResponse.json(
        { error: "Withdrawal payout request not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      status,
    };

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes?.trim() || null;
    }

    if (status === "COMPLETED") {
      if (transactionId && typeof transactionId === "string") {
        updateData.transactionId = transactionId.trim();
      }
      if (transactionProof && typeof transactionProof === "string") {
        updateData.transactionProof = transactionProof.trim();
      }
      updateData.processedAt = new Date();
    } else if (status === "PROCESSING") {
      if (transactionId) {
        updateData.transactionId = transactionId.trim();
      }
    } else if (status === "REJECTED") {
      updateData.processedAt = new Date();
    }

    const updatedPayout = await db.withdrawalRequest.update({
      where: { id },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const statusDisplayMap: Record<string, string> = {
      PROCESSING: "marked as Processing",
      COMPLETED: "marked as Processed / Completed",
      REJECTED: "marked as Rejected",
      PENDING: "reset to Pending",
    };

    return NextResponse.json({
      success: true,
      message: `Payout request of ${updatedPayout.currency} ${updatedPayout.amount} for ${updatedPayout.organization.name} was ${statusDisplayMap[status] || "updated"}.`,
      withdrawal: updatedPayout,
    });
  } catch (error: any) {
    console.error("[API /api/admin/payouts/[id] PATCH Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update payout request" },
      { status: 500 }
    );
  }
}
