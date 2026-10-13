import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BookingPaymentClient from "@/components/booking/BookingPaymentClient";
import { formatStayDate, nightsBetween } from "@/lib/dates";
import { getInventoryScopeConflicts } from "@/lib/availability";
import { cardTotalFor, loadBookingForPayment, paymentLinkState, PAYMENT_LINK_MESSAGES } from "@/lib/booking-payment";
import { formatManilaDateTime } from "@/lib/booking-request-emails";

// Payment page for an APPROVED booking request (Instant Booking off). The token in the
// URL is the only credential, as on /pay/[token] for additional charges.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pay for your stay — Haven in Lipa",
  robots: { index: false, follow: false },
};

const peso = (n: number) => `₱${Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
const firstName = (full: string) => full.trim().split(/\s+/)[0] || full;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-offwhite flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-6">
          <h1 className="font-serif text-[1.5rem] text-forest font-semibold">Haven in Lipa</h1>
          <p className="text-[12px] text-charcoal/45 uppercase tracking-wider mt-1">Secure Payment</p>
        </div>
        {children}
        <p className="text-center text-[11px] text-charcoal/35 mt-6">
          Questions? Email{" "}
          <a href="mailto:customerservice@haveninlipa.com" className="underline">customerservice@haveninlipa.com</a>
        </p>
      </div>
    </main>
  );
}

function StatusCard({ icon, color, title, body }: { icon: string; color: string; title: string; body: string }) {
  return (
    <div className="bg-white rounded-[16px] p-8 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] text-center">
      <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 ${color}`}>
        <i className={`fa-solid ${icon} text-2xl`} aria-hidden="true" />
      </div>
      <h2 className="font-serif text-[1.3rem] text-charcoal font-semibold mb-2">{title}</h2>
      <p className="text-[14px] text-charcoal/65 leading-relaxed">{body}</p>
    </div>
  );
}

export default async function BookingPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await loadBookingForPayment(token);
  if (!booking) notFound();

  const state = paymentLinkState(booking, new Date());

  if (state === "confirmed") {
    return (
      <Shell>
        <StatusCard icon="fa-circle-check" color="bg-green-100 text-green-600" title="Paid and confirmed" body={PAYMENT_LINK_MESSAGES.confirmed} />
      </Shell>
    );
  }
  if (state === "pending") {
    return (
      <Shell>
        <StatusCard icon="fa-clock" color="bg-blue-100 text-blue-600" title="We're verifying your payment" body={PAYMENT_LINK_MESSAGES.pending} />
      </Shell>
    );
  }
  if (state !== "payable") {
    return (
      <Shell>
        <StatusCard
          icon="fa-circle-xmark"
          color="bg-gray-100 text-gray-500"
          title={state === "link_expired" ? "This payment link has expired" : "This payment link is no longer active"}
          body={PAYMENT_LINK_MESSAGES[state]}
        />
      </Shell>
    );
  }

  // An approved request holds no dates, so they may have been booked since. Say so
  // before the guest pays; the routes behind this page check again.
  const conflicts = await getInventoryScopeConflicts({
    propertyId: booking.propertyId,
    start: booking.checkIn,
    end: booking.checkOut,
    excludeBookingId: booking.id,
  });
  if (conflicts.length > 0) {
    return (
      <Shell>
        <StatusCard
          icon="fa-calendar-xmark"
          color="bg-amber-100 text-amber-600"
          title="These dates are no longer available"
          body="We are sorry. Another guest booked these dates before this request was paid. Please do not send a payment. You are welcome to check other dates on our website."
        />
      </Shell>
    );
  }

  const total = Number(booking.totalPrice);
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const shortDate = (d: Date) => formatStayDate(d, { month: "short", day: "numeric", year: "numeric" });

  return (
    <Shell>
      <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] mb-5">
        <p className="text-[12px] font-semibold text-charcoal/40 uppercase tracking-wider mb-3">Amount due</p>
        <div className="font-serif text-[1.7rem] text-charcoal font-semibold">{peso(total)}</div>
        <dl className="mt-3 pt-3 border-t border-black/[.06] text-[13.5px] text-charcoal/65 space-y-1">
          <div className="flex justify-between gap-3"><dt className="text-charcoal/45">Stay</dt><dd className="text-right">{booking.property.name}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-charcoal/45">Check-in</dt><dd>{shortDate(booking.checkIn)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-charcoal/45">Check-out</dt><dd>{shortDate(booking.checkOut)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-charcoal/45">Nights</dt><dd>{nights}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-charcoal/45">Guests</dt><dd>{booking.guests}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-charcoal/45">Guest</dt><dd className="text-right">{booking.guestName}</dd></div>
        </dl>
      </div>

      <div className="text-[12.5px] text-amber-900 bg-amber-50 border border-amber-200 rounded-[10px] px-4 py-3 mb-5">
        Your dates are not held until you pay. They are first come, first served.
        {booking.paymentLinkExpiresAt && (
          <> This link is valid until <strong>{formatManilaDateTime(booking.paymentLinkExpiresAt)}</strong> (Lipa time).</>
        )}
      </div>

      <BookingPaymentClient
        token={token}
        amount={total}
        cardFee={cardTotalFor(total).fee}
        cardTotal={cardTotalFor(total).total}
        propertyName={booking.property.name}
        propertySlug={booking.property.slug}
        guestFirstName={firstName(booking.guestName)}
      />
    </Shell>
  );
}
