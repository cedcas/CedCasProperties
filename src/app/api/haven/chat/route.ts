import { NextResponse } from "next/server";
import { handleHavenChat, type HavenChatResponse } from "@/lib/haven/chat-service";
import { getClientIp } from "@/lib/haven/rate-limit";
import { REQUEST_TIMEOUT_MS } from "@/lib/haven/config";

// Node runtime: the provider adapter, Prisma and crypto all need it (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function timeoutResponse(ms: number): Promise<HavenChatResponse> {
  return new Promise((resolve) => setTimeout(() => resolve({ mode: "static", reason: "error" }), ms));
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ mode: "static", reason: "error" } satisfies HavenChatResponse);
  }

  const ip = getClientIp(req);

  // Belt-and-suspenders: handleHavenChat never throws, but a hung provider call must not
  // hang the response — race it against the same budget the provider fetch itself uses.
  const response = await Promise.race([
    handleHavenChat(body, ip).catch(
      (): HavenChatResponse => ({ mode: "static", reason: "error" })
    ),
    timeoutResponse(REQUEST_TIMEOUT_MS),
  ]);

  return NextResponse.json(response);
}
