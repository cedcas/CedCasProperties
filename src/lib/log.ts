import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

interface LogParams {
  actor: string;
  actorRole: "admin" | "manager" | "guest";
  actorId?: number;
  action: string;
  module: "properties" | "bookings" | "messages" | "testimonials" | "promo_codes" | "users" | "booking_flow" | "logs";
  target?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export async function logAction(params: LogParams) {
  try {
    await prisma.adminLog.create({
      data: {
        actor: params.actor,
        actorRole: params.actorRole,
        actorId: params.actorId ?? null,
        action: params.action,
        module: params.module,
        target: params.target ?? null,
        ipAddress: params.ipAddress ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch {
    // Logging should never break the main flow
    console.error("[logAction] Failed to write log entry");
  }
}

export function getIpFromRequest(req: NextRequest): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined
  );
}
