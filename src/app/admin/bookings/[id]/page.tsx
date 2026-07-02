import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import DeleteButton from "@/components/admin/DeleteButton";
import BookingStatusSelect from "@/components/admin/BookingStatusSelect";
import AdditionalChargesManager from "@/components/admin/AdditionalChargesManager";
import NotesEditor from "@/components/admin/NotesEditor";
import { formatStayDate } from "@/lib/dates";

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest */}
        <section className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
          <h2 className="font-serif font-semibold text-charcoal text-[1rem] mb-5">Guest</h2>
          <dl className="space-y-3 text-[13.5px]">
            <Row label="Name" value={booking.guestName} />
            <Row label="Email" value={<a href={`mailto:${booking.guestEmail}`} className="text-forest hover:underline break-all">{booking.guestEmail}</a>} />
            <Row label="Phone" value={booking.guestPhone ? <a href={`tel:${booking.guestPhone}`} className="text-forest hover:underline">{booking.guestPhone}</a> : <span className="text-charcoal/35">—</span>} />
            <Row label="Guests" value={String(booking.guests)} />
          </dl>
          <div className="mt-5 pt-4 border-t border-black/[.06]">
            <Link href={`/admin/customers/${booking.id}`} className="text-[13px] text-forest font-semibold hover:underline inline-flex items-center gap-1.5">
              View customer <i className="fa-solid fa-arrow-right text-[11px]" />
            </Link>
          </div>
        </section>

        {/* Stay */}
        <section className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
          <h2 className="font-serif font-semibold text-charcoal text-[1rem] mb-5">Stay</h2>
          <dl className="space-y-3 text-[13.5px]">
            <Row label="Property" value={<Link href={`/properties/${booking.property.slug}`} className="text-forest hover:underline">{booking.property.name}</Link>} />
            <Row label="Check-in" value={formatStayDate(booking.checkIn)} />
            <Row label="Check-out" value={formatStayDate(booking.checkOut)} />
            <Row label="Nights" value={String(nights)} />
          </dl>
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
        </section>

        {/* Payment */}
        <section className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
          <h2 className="font-serif font-semibold text-charcoal text-[1rem] mb-5">Payment</h2>
          <dl className="space-y-3 text-[13.5px]">
            <Row label="Method" value={booking.paymentMethod ? booking.paymentMethod.toUpperCase() : <span className="text-charcoal/35">—</span>} />
            <Row label="Status" value={
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${booking.status === "confirmed" ? "bg-green-100 text-green-700" : booking.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>{booking.status}</span>
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
