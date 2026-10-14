import { prisma } from "@/lib/prisma";
import { bookingStatusBadgeClass } from "@/lib/booking-status";
import { notFound } from "next/navigation";
import Link from "next/link";
import DeleteButton from "@/components/admin/DeleteButton";
import BookingStatusSelect from "@/components/admin/BookingStatusSelect";
import AdditionalChargesManager from "@/components/admin/AdditionalChargesManager";
import NotesEditor from "@/components/admin/NotesEditor";
import GuestStayEditor from "@/components/admin/GuestStayEditor";
import BookingRequestActions from "@/components/admin/BookingRequestActions";
import { DECISION_NOTE_MAX } from "@/lib/booking-requests";
import { bookingPaymentUrl, formatManilaDateTime } from "@/lib/booking-request-emails";
import { todayInManila } from "@/lib/dates";
import { checkPermission } from "@/lib/admin-permissions";
import {
  AMENDMENT_LOG_PREFIX,
  classifyStayPhase,
  editableFieldsFor,
  phaseNotice,
  snapshotOf,
  type ReviewChange,
} from "@/lib/booking-amendment";

export const dynamic = "force-dynamic";

const peso = (v: unknown) => `₱${Number(v ?? 0).toLocaleString()}`;

function nightsBetween(checkIn: Date, checkOut: Date) {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: Number(id) },
    include: {
      property: { select: { name: true, slug: true } },
      additionalCharges: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!booking) notFound();

  // Guest & Stay amendments. The Edit control is only offered to someone who holds the
  // `bookings` permission; the API enforces the same check regardless of what is shown.
  const [permission, activeProperties, amendmentLogs] = await Promise.all([
    checkPermission("bookings"),
    prisma.property.findMany({
      where: { OR: [{ isActive: true }, { id: booking.propertyId }] },
      select: { id: true, name: true, maxGuests: true },
      orderBy: { name: "asc" },
    }),
    prisma.adminLog.findMany({
      where: { module: "bookings", target: `booking-${booking.id}`, action: { startsWith: AMENDMENT_LOG_PREFIX } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const phase = classifyStayPhase(booking, todayInManila());
  const amendments = amendmentLogs.map((log) => {
    let meta: { reason?: string; changes?: ReviewChange[] } = {};
    try {
      meta = log.metadata ? JSON.parse(log.metadata) : {};
    } catch {
      // Unreadable metadata — still show who and when.
    }
    return { id: log.id, actor: log.actor, at: log.createdAt, reason: meta.reason ?? "", changes: meta.changes ?? [] };
  });

  const charges = booking.additionalCharges.map((c) => ({
    id: c.id,
    description: c.description,
    amount: Number(c.amount),
    token: c.token,
    status: c.status,
    paymentMethod: c.paymentMethod,
    notifiedAt: c.notifiedAt ? c.notifiedAt.toISOString() : null,
    paidAt: c.paidAt ? c.paidAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  }));

  const nights = nightsBetween(booking.checkIn, booking.checkOut);

  const priceRows = [
    { label: `Nightly total${nights ? ` (${nights} night${nights !== 1 ? "s" : ""})` : ""}`, value: booking.nightlyTotal, show: booking.nightlyTotal != null },
    { label: "Extra-guest fee", value: booking.extraGuestFee, show: booking.extraGuestFee != null && Number(booking.extraGuestFee) > 0 },
    { label: `Discount${booking.discountCode ? ` (${booking.discountCode})` : ""}`, value: booking.discountAmount != null ? -Number(booking.discountAmount) : null, show: booking.discountAmount != null && Number(booking.discountAmount) > 0 },
    { label: "Stripe fee", value: booking.stripeFee, show: booking.stripeFee != null && Number(booking.stripeFee) > 0 },
  ].filter((r) => r.show);

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/bookings" className="text-[12.5px] text-charcoal/45 hover:text-forest transition-colors inline-flex items-center gap-1.5">
          <i className="fa-solid fa-arrow-left text-[11px]" /> Back to Bookings
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">{booking.guestName}</h1>
          <p className="text-charcoal/45 text-[14px] mt-1">Booking #{booking.id} · {booking.property.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <BookingStatusSelect id={booking.id} status={booking.status} />
          <DeleteButton id={booking.id} type="booking" redirectTo="/admin/bookings" />
        </div>
      </div>

      {/* Booking request (Instant Booking off) — decision panel and where the request stands */}
      {(booking.status === "requested" || booking.status === "approved" || booking.status === "declined" || booking.status === "expired") && (
        <section aria-labelledby="request-panel" className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-indigo-200 mb-6">
          <h2 id="request-panel" className="font-serif font-semibold text-charcoal text-[1rem] mb-2">Booking Request</h2>
          {booking.status === "requested" && (
            <>
              <p className="text-[13.5px] text-charcoal/75 mb-4">
                This guest is waiting for your decision
                {booking.requestExpiresAt && <> until <strong>{formatManilaDateTime(booking.requestExpiresAt)}</strong> (Lipa time), when the request expires</>}.
                No dates are held and nothing has been paid. Approving checks that the dates are still free, then emails the guest a
                payment link. If the details are not what you agreed with the guest, correct them below first.
              </p>
              {permission.ok ? (
                <BookingRequestActions id={booking.id} noteMax={DECISION_NOTE_MAX} />
              ) : (
                <p className="text-[13px] text-charcoal/55">Your account does not have the Bookings permission, so you cannot approve or decline.</p>
              )}
            </>
          )}
          {booking.status === "approved" && (
            <p className="text-[13.5px] text-charcoal/75">
              Approved{booking.decidedAt && <> on {formatManilaDateTime(booking.decidedAt)}</>}. The guest has a payment link
              {booking.paymentLinkExpiresAt && <> valid until <strong>{formatManilaDateTime(booking.paymentLinkExpiresAt)}</strong> (Lipa time)</>}.
              The dates are <strong>not held</strong> until the guest pays. To withdraw the approval, change the status to cancelled.
              {booking.paymentToken && permission.ok && (
                <span className="block mt-2 text-[12.5px] text-charcoal/60">
                  Payment link, if you need to send it again:{" "}
                  <span className="font-mono text-[12px] break-all select-all">{bookingPaymentUrl(booking.paymentToken)}</span>
                </span>
              )}
            </p>
          )}
          {booking.status === "declined" && (
            <p className="text-[13.5px] text-charcoal/75">
              Declined{booking.decidedAt && <> on {formatManilaDateTime(booking.decidedAt)}</>}. The guest was told by email.
            </p>
          )}
          {booking.status === "expired" && (
            <p className="text-[13.5px] text-charcoal/75">
              Expired {booking.decidedAt ? "because the payment link was not used in time" : "without a decision"}. The guest was told by
              email. Nothing was paid.
            </p>
          )}
          {booking.decisionNote && <p className="text-[13px] text-charcoal/60 mt-2">Note: {booking.decisionNote}</p>}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest + Stay (editable) */}
        <GuestStayEditor
          bookingId={booking.id}
          snapshot={snapshotOf(booking)}
          propertyName={booking.property.name}
          propertySlug={booking.property.slug}
          properties={activeProperties}
          editable={editableFieldsFor(phase)}
          notice={phaseNotice(phase)}
          blockedReason={
            permission.ok
              ? null
              : permission.status === 403
                ? "Your account does not have the Bookings permission. An admin can switch it on for you under Users."
                : "Your sign-in could not be verified. Sign out and sign in again to edit."
          }
          guestFooter={
            <div className="mt-5 pt-4 border-t border-black/[.06]">
              <Link href={`/admin/customers/${booking.id}`} className="text-[13px] text-forest font-semibold hover:underline inline-flex items-center gap-1.5">
                View customer <i className="fa-solid fa-arrow-right text-[11px]" />
              </Link>
            </div>
          }
          stayFooter={
            <>
              {booking.notes && (
                <div className="mt-5 pt-4 border-t border-black/[.06]">
                  <div className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-2">Guest&apos;s Request</div>
                  <p className="text-[13.5px] text-charcoal/70 whitespace-pre-wrap bg-cream/40 rounded-[10px] px-4 py-2.5">{booking.notes}</p>
                  <p className="text-[11px] text-charcoal/35 mt-1.5">Submitted by the guest at booking · read-only</p>
                </div>
              )}
              <div className="mt-5 pt-4 border-t border-black/[.06]">
                <NotesEditor
                  endpoint={`/api/admin/bookings/${booking.id}`}
                  field="adminNotes"
                  initialValue={booking.adminNotes}
                  label="Admin Comment (internal · not shown to guest)"
                  placeholder="Internal notes about this stay (e.g. guest review, reminders)…"
                />
              </div>
            </>
          }
        />

        {/* Payment */}
        <section className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
          <h2 className="font-serif font-semibold text-charcoal text-[1rem] mb-5">Payment</h2>
          <dl className="space-y-3 text-[13.5px]">
            <Row label="Method" value={booking.paymentMethod ? booking.paymentMethod.toUpperCase() : <span className="text-charcoal/35">—</span>} />
            <Row label="Status" value={
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${bookingStatusBadgeClass(booking.status)}`}>{booking.status}</span>
            } />
            {booking.stripePaymentIntentId && <Row label="Stripe intent" value={<span className="font-mono text-[12px] text-charcoal/60 break-all">{booking.stripePaymentIntentId}</span>} />}
          </dl>
        </section>

        {/* Price breakdown */}
        <section className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
          <h2 className="font-serif font-semibold text-charcoal text-[1rem] mb-5">Price Breakdown</h2>
          <dl className="space-y-2.5 text-[13.5px]">
            {priceRows.length === 0 && <p className="text-charcoal/35 text-[13px]">No itemized breakdown recorded.</p>}
            {priceRows.map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <dt className="text-charcoal/55">{r.label}</dt>
                <dd className="text-charcoal/80">{peso(r.value)}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-black/[.08]">
              <dt className="font-semibold text-charcoal">Total</dt>
              <dd className="font-bold text-charcoal text-[15px]">{peso(booking.totalPrice)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Additional charges */}
      <AdditionalChargesManager bookingId={booking.id} guestName={booking.guestName} initialCharges={charges} />

      {/* Additional charges notes */}
      <section className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] mt-6">
        <NotesEditor
          endpoint={`/api/admin/bookings/${booking.id}`}
          field="chargesNotes"
          initialValue={booking.chargesNotes}
          label="Charges Comment (internal · not shown to guest)"
          placeholder="Internal notes about charges, damages, or incidentals for this booking…"
        />
      </section>

      {/* Amendment history */}
      {amendments.length > 0 && (
        <section aria-labelledby="amendment-history" className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] mt-6">
          <h2 id="amendment-history" className="font-serif font-semibold text-charcoal text-[1rem] mb-4">Amendment History</h2>
          <ol className="space-y-4 text-[13.5px]">
            {amendments.map((a) => (
              <li key={a.id} className="border-l-2 border-gold/60 pl-4">
                <p className="text-charcoal/80">
                  <strong>{a.actor}</strong>{" "}
                  <span className="text-charcoal/45">· {a.at.toLocaleString("en-PH", { timeZone: "Asia/Manila" })} (Manila)</span>
                </p>
                {a.reason && <p className="text-charcoal/70 mt-0.5">Reason: {a.reason}</p>}
                <ul className="mt-1 text-charcoal/60 space-y-0.5">
                  {a.changes.map((c) => (
                    <li key={c.field}>{c.label}: {c.before} → <span className="text-charcoal/85">{c.after}</span></li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Meta */}
      <div className="mt-6 text-[12px] text-charcoal/40 flex flex-wrap gap-x-6 gap-y-1">
        <span>Created {new Date(booking.createdAt).toLocaleString("en-PH")}</span>
        <span>Updated {new Date(booking.updatedAt).toLocaleString("en-PH")}</span>
        {booking.optedOutAt && <span className="text-red-500">Opted out of SMS {new Date(booking.optedOutAt).toLocaleString("en-PH")}</span>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-charcoal/45 flex-shrink-0">{label}</dt>
      <dd className="text-charcoal/80 text-right">{value}</dd>
    </div>
  );
}
