import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { checkPermission, permissionDenied } from "@/lib/admin-permissions";
import { getIpFromRequest } from "@/lib/log";
import { approveBookingRequest, BookingRequestError, declineBookingRequest } from "@/lib/booking-requests";

export const dynamic = "force-dynamic";

// POST /api/admin/bookings/[id]/request — decide a booking request.
//
//   { action: "approve", note? }  → approved; the guest is emailed a payment link
//   { action: "decline", note? }  → declined; the guest is told (the note is shown to them)
//
// Requires the `bookings` permission, checked against the database on every call.
// Approval is refused when the dates are no longer free. It does not hold them.
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
  if (body.action !== "approve" && body.action !== "decline") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  try {
    const decide = body.action === "approve" ? approveBookingRequest : declineBookingRequest;
    const result = await decide({
      bookingId,
      actor: permission.actor,
      note: body.note,
      ipAddress: getIpFromRequest(req),
    });
    try {
      revalidatePath(`/admin/bookings/${bookingId}`);
      revalidatePath("/admin/bookings");
    } catch {
      // Not in a request scope (tests) — nothing to refresh.
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BookingRequestError) {
      return NextResponse.json(
        { error: err.message, code: err.code, ...(err.conflicts.length > 0 ? { conflicts: err.conflicts } : {}) },
        { status: err.status }
      );
    }
    console.error(`[booking-request] booking #${bookingId} ${body.action} failed:`, err);
    return NextResponse.json(
      { error: "The request could not be updated. Reload the booking to see its current status.", code: "failed" },
      { status: 500 }
    );
  }
}
