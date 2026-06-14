import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST — issue a client upload token so the browser can upload the file
// DIRECTLY to Vercel Blob, bypassing the 4.5 MB serverless request-body limit.
// Only the tiny JSON token-request passes through this function.
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ["image/*"],
        // 25 MB ceiling — generous for phone photos, blocks abuse.
        maximumSizeInBytes: 25 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ propertyId: id, pathname }),
      }),
      // Required by the API; the DB write is done client-side after upload
      // (this callback can't reach localhost during dev).
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload token failed" },
      { status: 400 }
    );
  }
}
