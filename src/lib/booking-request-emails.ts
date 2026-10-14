/**
 * Emails for the booking request lifecycle (src/lib/booking-requests.ts).
 *
 * Builders are pure — they return `{ subject, html }` and send nothing — so the wording
 * can be tested. Guest wording follows the site's content rules: card payments are
 * "Credit/Debit Card", and nothing here mentions deposits, ID checks or arrival details.
 */

import { formatStayDate, nightsBetween } from "@/lib/dates";

export const ADMIN_REQUEST_EMAIL_TO = "customerservice@haveninlipa.com";

export interface RequestEmailBooking {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  propertyName: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const peso = (n: number) => `₱${Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

/** "Tue, Oct 13, 2026, 9:30 PM" in Lipa time, whatever the server's timezone. */
export function formatManilaDateTime(d: Date): string {
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "https://haveninlipa.com").replace(/\/$/, "");
}

/** Absolute public payment URL for an approved request. */
export function bookingPaymentUrl(token: string): string {
  return `${baseUrl()}/pay/booking/${token}`;
}

function adminBookingUrl(bookingId: number): string {
  return `${baseUrl()}/admin/bookings/${bookingId}`;
}

function summaryTable(b: RequestEmailBooking, extraRows = ""): string {
  const nights = nightsBetween(b.checkIn, b.checkOut);
  const row = (label: string, value: string) =>
    `<tr><td style="padding:5px 0;color:#666;width:130px">${label}</td><td>${value}</td></tr>`;
  return `
    <div style="background:#FFF8FA;border-radius:8px;padding:20px 24px;margin-bottom:24px">
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        ${row("Property", `<strong>${esc(b.propertyName)}</strong>`)}
        ${row("Check-in", `<strong>${formatStayDate(b.checkIn)}</strong>`)}
        ${row("Check-out", `<strong>${formatStayDate(b.checkOut)}</strong>`)}
        ${row("Duration", `${nights} night${nights !== 1 ? "s" : ""}`)}
        ${row("Guests", String(b.guests))}
        ${row("Total", `<strong>${peso(b.totalPrice)}</strong>`)}
        ${extraRows}
      </table>
    </div>`;
}

function layout(heading: string, subheading: string, body: string): string {
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#335238">
      <div style="background:#335238;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">${heading}</h1>
        <p style="color:rgba(255,255,255,.7);margin:6px 0 0;font-size:13px">${subheading}</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px">
        ${body}
      </div>
    </div>`;
}

const p = (html: string) => `<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 20px">${html}</p>`;

const GUEST_CONTACT = `
  <div style="font-size:14px;color:#444">
    📧 <a href="mailto:customerservice@haveninlipa.com" style="color:#335238">customerservice@haveninlipa.com</a><br/>
    📞 +639066554415
  </div>
  <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e5e5;font-size:12px;color:#999;text-align:center">
    HavenInLipa — Stay in Style, Live in Comfort.<br/>
    Lipa City, Batangas, Philippines
  </div>`;

const hi = (b: RequestEmailBooking) => `<p style="font-size:15px;margin:0 0 20px">Hi <strong>${esc(b.guestName)}</strong>,</p>`;

// ── Guest ──────────────────────────────────────────────────────────────────

export function requestReceivedGuestEmail(b: RequestEmailBooking, expiresAt: Date) {
  return {
    subject: `Booking Request Received – ${b.propertyName}`,
    html: layout(
      "We Received Your Booking Request",
      "No payment is needed yet",
      `${hi(b)}
       ${p(`Thank you for your request to stay at <strong>${esc(b.propertyName)}</strong>. We will review it and reply by email by <strong>${formatManilaDateTime(expiresAt)}</strong> (Lipa time).`)}
       ${summaryTable(b)}
       ${p("Please do not send any payment yet. If your request is approved, we will email you a payment link.")}
       ${p("Your dates are not held yet. They stay open to other guests until a booking is paid, first come, first served.")}
       ${GUEST_CONTACT}`
    ),
  };
}

export function requestApprovedGuestEmail(b: RequestEmailBooking, input: { paymentUrl: string; expiresAt: Date }) {
  return {
    subject: `Your Booking Request Is Approved – ${b.propertyName}`,
    html: layout(
      "Your Request Is Approved",
      "Pay to book your stay",
      `${hi(b)}
       ${p(`Good news! Your request to stay at <strong>${esc(b.propertyName)}</strong> is approved. Please check the details below, then pay to book your stay.`)}
       ${summaryTable(b)}
       <p style="text-align:center;margin:0 0 20px">
         <a href="${input.paymentUrl}" style="display:inline-block;background:#335238;color:#fff;text-decoration:none;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:999px">Pay for your stay</a>
       </p>
       ${p(`This payment link is valid until <strong>${formatManilaDateTime(input.expiresAt)}</strong> (Lipa time). You can pay by GCash, BPI or Credit/Debit Card. Paying by Credit/Debit Card adds a 6% transaction fee.`)}
       ${p("<strong>Your dates are not held yet.</strong> They are first come, first served until payment, so another guest who pays first gets them.")}
       ${p(`If the button does not work, open this link: <a href="${input.paymentUrl}" style="color:#335238">${input.paymentUrl}</a>`)}
       ${GUEST_CONTACT}`
    ),
  };
}

export function requestDeclinedGuestEmail(b: RequestEmailBooking, note: string | null) {
  return {
    subject: `About Your Booking Request – ${b.propertyName}`,
    html: layout(
      "We Could Not Approve Your Request",
      "No payment was taken",
      `${hi(b)}
       ${p(`Thank you for your interest in <strong>${esc(b.propertyName)}</strong>. We are sorry, but we are not able to approve this request.`)}
       ${note ? p(`<em>${esc(note)}</em>`) : ""}
       ${summaryTable(b)}
       ${p("No payment was taken. You are welcome to check other dates or listings on our website.")}
       ${GUEST_CONTACT}`
    ),
  };
}

/** `stage` — which clock ran out: the wait for a decision, or the payment link. */
export function requestExpiredGuestEmail(b: RequestEmailBooking, stage: "request" | "payment_link") {
  return {
    subject: `Your Booking Request Has Expired – ${b.propertyName}`,
    html: layout(
      "Your Booking Request Has Expired",
      "No payment was taken",
      `${hi(b)}
       ${p(
         stage === "request"
           ? `We are sorry. We were not able to reply to your request for <strong>${esc(b.propertyName)}</strong> in time, so it has expired.`
           : `The payment link for your approved request at <strong>${esc(b.propertyName)}</strong> has expired because the stay was not paid in time.`
       )}
       ${summaryTable(b)}
       ${p("No payment was taken. If you would still like to stay with us, you are welcome to send a new request on our website.")}
       ${GUEST_CONTACT}`
    ),
  };
}

/** GCash/BPI through the payment link: the guest says they have paid; the dates are now held. */
export function paymentSubmittedGuestEmail(b: RequestEmailBooking, paymentMethod: "gcash" | "bpi") {
  const method = paymentMethod === "gcash" ? "GCash" : "BPI";
  return {
    subject: `Payment Received, Being Verified – ${b.propertyName}`,
    html: layout(
      "Thank You. We Are Verifying Your Payment",
      "Your dates are now held",
      `${hi(b)}
       ${p(`Thank you for your ${method} payment for <strong>${esc(b.propertyName)}</strong>. Your dates are now held while we verify it. You will receive a confirmation email once it is verified.`)}
       ${summaryTable(b, `<tr><td style="padding:5px 0;color:#666">Payment via</td><td><strong>${method}</strong></td></tr>`)}
       ${p("There is nothing more you need to do. Please do not send the payment again.")}
       ${GUEST_CONTACT}`
    ),
  };
}

/** Card through the payment link: paid, verified and confirmed in one step. `b.totalPrice` includes the fee. */
export function bookingConfirmedGuestEmail(b: RequestEmailBooking, cardFee: number) {
  return {
    subject: `Booking Confirmed – ${b.propertyName}`,
    html: layout(
      "Your Stay Is Confirmed! 🎉",
      "We look forward to welcoming you",
      `${hi(b)}
       ${p(`Great news! Your card payment went through and your booking at <strong>${esc(b.propertyName)}</strong> is officially confirmed.`)}
       ${summaryTable(b, `<tr><td style="padding:5px 0;color:#666">Includes</td><td>Credit/Debit Card transaction fee (6%): ${peso(cardFee)}</td></tr>`)}
       ${p("If you have any questions before your stay, do not hesitate to reach out to us:")}
       ${GUEST_CONTACT}`
    ),
  };
}

// ── Admin ──────────────────────────────────────────────────────────────────

function adminContactRows(b: RequestEmailBooking): string {
  return `
    <tr><td style="padding:5px 0;color:#666">Guest</td><td>${esc(b.guestName)}</td></tr>
    <tr><td style="padding:5px 0;color:#666">Email</td><td><a href="mailto:${esc(b.guestEmail)}">${esc(b.guestEmail)}</a></td></tr>
    <tr><td style="padding:5px 0;color:#666">Phone</td><td>${esc(b.guestPhone)}</td></tr>`;
}

export function requestReceivedAdminEmail(b: RequestEmailBooking, input: { expiresAt: Date; notes: string | null }) {
  return {
    subject: `New Booking Request #${b.id} – ${b.propertyName}`,
    html: layout(
      "New Booking Request",
      "Waiting for your approval. No dates are held",
      `${summaryTable(b, adminContactRows(b))}
       ${input.notes ? p(`<strong>Guest's note:</strong> ${esc(input.notes)}`) : ""}
       ${p(`Approve or decline by <strong>${formatManilaDateTime(input.expiresAt)}</strong> (Lipa time). After that the request expires and the guest is told.`)}
       ${p(`<a href="${adminBookingUrl(b.id)}" style="color:#335238;font-weight:bold">Open booking #${b.id} in admin</a>`)}`
    ),
  };
}

export function unverifiedPaymentAdminEmail(b: RequestEmailBooking, input: { paymentMethod: string | null; submittedAt: Date; hours: number }) {
  const method = input.paymentMethod === "gcash" ? "GCash" : input.paymentMethod === "bpi" ? "BPI" : "A";
  return {
    subject: `Payment Not Yet Verified – Booking #${b.id}, ${b.propertyName}`,
    html: layout(
      "A Payment Is Still Waiting to Be Verified",
      `Submitted more than ${input.hours} hours ago`,
      `${p(`${method} payment for booking #${b.id} was submitted on <strong>${formatManilaDateTime(input.submittedAt)}</strong> (Lipa time) and the booking is still pending.`)}
       ${summaryTable(b, adminContactRows(b))}
       ${p("The dates stay held until you confirm or cancel the booking. Nothing is released automatically. This reminder is sent once.")}
       ${p(`<a href="${adminBookingUrl(b.id)}" style="color:#335238;font-weight:bold">Open booking #${b.id} in admin</a>`)}`
    ),
  };
}

export function paymentSubmittedAdminEmail(b: RequestEmailBooking, paymentMethod: "gcash" | "bpi") {
  const method = paymentMethod === "gcash" ? "GCash" : "BPI";
  return {
    subject: `Verify Payment – Booking #${b.id}, ${b.propertyName}`,
    html: layout(
      `Verify a ${method} Payment`,
      "Approved request. The guest reports paying; the dates are now held",
      `${p(`<strong>${esc(b.guestName)}</strong> reports paying <strong>${peso(b.totalPrice)}</strong> by ${method} for approved booking request #${b.id}. Please verify receipt, then confirm the booking.`)}
       ${summaryTable(b, adminContactRows(b))}
       ${p(`<a href="${adminBookingUrl(b.id)}" style="color:#335238;font-weight:bold">Open booking #${b.id} in admin</a>`)}`
    ),
  };
}

export function bookingConfirmedAdminEmail(b: RequestEmailBooking, input: { cardFee: number; paymentReference: string }) {
  return {
    subject: `Booking Confirmed (Card) – Booking #${b.id}, ${b.propertyName}`,
    html: layout(
      "Booking Confirmed",
      "Approved request paid by card. The guest has been notified",
      `${summaryTable(
        b,
        `${adminContactRows(b)}
         <tr><td style="padding:5px 0;color:#666">Card fee</td><td>${peso(input.cardFee)} (included in the total)</td></tr>
         <tr><td style="padding:5px 0;color:#666">Stripe payment</td><td style="font-family:monospace">${esc(input.paymentReference)}</td></tr>`
      )}
       ${p(`<a href="${adminBookingUrl(b.id)}" style="color:#335238;font-weight:bold">Open booking #${b.id} in admin</a>`)}`
    ),
  };
}

/** GCash/BPI "I Paid" on a link whose dates were taken in the meantime. Refund is by hand. */
export function paymentLinkUnavailableAdminEmail(b: RequestEmailBooking, paymentMethod: "gcash" | "bpi") {
  const method = paymentMethod === "gcash" ? "GCash" : "BPI";
  return {
    subject: `⚠️ Guest Reports Paying, Dates Already Taken – Booking #${b.id}, ${b.propertyName}`,
    html: layout(
      "A Guest May Have Paid for Dates That Are Taken",
      "No booking was made. Nothing is refunded automatically",
      `${p(`<strong>${esc(b.guestName)}</strong> tapped "I've Paid" (${method}) for approved booking request #${b.id}, but the dates were booked by someone else first, so the site refused it and holds nothing.`)}
       ${summaryTable(b, adminContactRows(b))}
       ${p(`Check your ${method} account for a payment of <strong>${peso(b.totalPrice)}</strong> from this guest. If it arrived, it needs to be returned by hand. The guest was told not to pay again and to contact us. This alert is sent once per request.`)}
       ${p(`<a href="${adminBookingUrl(b.id)}" style="color:#335238;font-weight:bold">Open booking #${b.id} in admin</a>`)}`
    ),
  };
}
