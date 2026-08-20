import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { executeDeleteService } from "@/lib/delete-service";

export async function POST(req: Request) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { videoIds = [], folderIds = [] } = await req.json();

    if (!Array.isArray(videoIds) || !Array.isArray(folderIds)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    if (videoIds.length === 0 && folderIds.length === 0) {
      return NextResponse.json({ error: "No items selected for deletion" }, { status: 400 });
    }

    const result = await executeDeleteService({
      organizationId: authCtx.orgId,
      videoIds,
      folderIds,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error during batch delete:", error);
    return NextResponse.json({ error: error.message || "Failed to execute batch delete" }, { status: 500 });
  }
}
