import { NextResponse } from "next/server";
import { getShareContent } from "@/lib/share-server";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const url = new URL(req.url);
    const subfolderId = url.searchParams.get("subfolderId");
    const folderIdParam =
      url.searchParams.get("folderId") ||
      url.searchParams.get("fromFolder") ||
      url.searchParams.get("fromFolderId");
    const rootFolderIdParam = url.searchParams.get("rootFolderId");
    const playlistIdParam =
      url.searchParams.get("playlistId") || url.searchParams.get("playlist");
    const headerCountry =
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("x-country-code") ||
      null;

    const { status, body } = await getShareContent(
      token,
      {
        subfolderId,
        folderId: folderIdParam,
        rootFolderId: rootFolderIdParam,
        playlistId: playlistIdParam,
      },
      headerCountry
    );
    return NextResponse.json(body, { status });
  } catch (err: any) {
    console.error("[GET Shared Item Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
