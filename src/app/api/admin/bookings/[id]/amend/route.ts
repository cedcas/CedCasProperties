import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { checkPermission, permissionDenied } from "@/lib/admin-permissions";
import { getIpFromRequest, logAction } from "@/lib/log";
import {
  AmendmentError,
  commitAmendment,
  previewAmendment,
  resyncAmendedBooking,
} from "@/lib/booking-amendment";

export const dynamic = "force-dynamic";
// The commit holds the inventory lock across the availability check, the booking update
// and the sibling-block reconciliation; give it room on a slow database round-trip.
export const maxDuration = 60;

// POST /api/admin/bookings/[id]/amend — Guest & Stay amendments.
//
//   { action: "preview", changes }                              → review, no writes
//   { action: "commit",  changes, reason, expectedUpdatedAt }   → apply
//   { action: "resync" }                                        → re-run propagation (idempotent)
//
// Requires the `bookings` permission, checked against the database on every call — a
// logged-in manager without it gets 403 whatever the UI showed them.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permission = await checkPermission("bookings");
  if (!permission.ok) return permissionDenied(permission);

  const bookingId = Number((await params).id);
  if (!Number.isInteger(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (body.action === "preview") {
      const review = await previewAmendment({ bookingId, changes: body.changes });
      return NextResponse.json({ review });
    }

    if (body.action === "commit") {
      const result = await commitAmendment({
        bookingId,
        changes: body.changes,
        reason: body.reason,
        expectedUpdatedAt: body.expectedUpdatedAt,
        pricing: body.pricing,
        actor: permission.actor,
        ipAddress: getIpFromRequest(req),
      });
      refreshViews(bookingId);
      return NextResponse.json(result);
    }

    if (body.action === "resync") {
      const result = await resyncAmendedBooking(bookingId);
      await logAction({
        actor: permission.actor.name,
        actorRole: permission.actor.role,
        actorId: permission.actor.id,
        action: `Re-ran propagation for booking #${bookingId}${result.verified ? "" : " — still incomplete"}`,
        module: "bookings",
        target: `booking-${bookingId}`,
        ipAddress: getIpFromRequest(req),
        metadata: { ...result },
      });
      refreshViews(bookingId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    if (err instanceof AmendmentError) {
      return NextResponse.json(
        { error: err.message, code: err.code, ...err.details },
        { status: err.status }
      );
    }
    console.error(`[amend] booking #${bookingId} ${String(body.action)} failed:`, err);
    // A failed commit rolled back as a unit, so the booking is as it was — but say so
    // rather than imply it, and let the client re-read before anyone retries.
    return NextResponse.json(
      {
        error:
          "The amendment could not be saved. Reload the booking to confirm its current details before trying again.",
        code: "failed",
      },
      { status: 500 }
    );
  }
}

/** Admin pages are force-dynamic already; this drops any client router cache for them. */
function refreshViews(bookingId: number) {
  try {
    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/calendar");
  } catch {
    // Not in a request scope (tests) — nothing to refresh.
  }
}
