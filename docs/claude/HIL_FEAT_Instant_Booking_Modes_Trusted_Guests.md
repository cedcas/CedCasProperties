# HIL Feature Brief — Instant Booking Modes & Request Lifecycle

**Status:** Design direction approved by the Owner 2026-10-09. **Implementation not yet authorized** — no code, migration or deploy until the Owner says go.
**Sequence:** Step 2 of 3 (Owner-approved order, 2026-10-09). Step 1: [Same-Day Booking](HIL_FEAT_Same_Day_Booking_Advance_Notice.md). Step 3: [Phone OTP & Trusted Guests](HIL_FEAT_Guest_Phone_OTP_Trust_KYC.md).
**Estimate:** 4 sessions for this step. All three briefs together: about 10 sessions (2 + 4 + 4).
**History:** first drafted 2026-10-09; rewritten the same day after a review against the code on `dev` (`977c8fa`).

## 1. What this delivers

A per-listing **Instant Booking** setting and the request-and-approval workflow behind it.

| Mode | New or unrecognized guest | Trusted returning guest |
|---|---|---|
| **Off** | Needs approval | Needs approval |
| **On** | Books instantly | Books instantly |
| **Auto** | Needs approval | Books instantly |

- **This step builds Off and On.** They need no guest verification.
- **Auto is enabled in Step 3**, because it depends on the verification code and the Trusted Guest Registry specified there. The setting stores the value `auto` from the start, but the admin UI does not offer it until Step 3 ships.
- Instant never bypasses availability, advance notice, capacity, pricing or payment checks.

**Today's behaviour is "On".** A card booking is confirmed as soon as the payment is verified, and a GCash/BPI booking is saved as `pending` for the Owner to verify the payment. The setting therefore defaults to On, and a listing left on On behaves as it does today.

This brief is the single home of the booking lifecycle. The other two briefs refer here and do not restate it.

## 2. Owner decisions (2026-10-09)

1. Three modes, set per bookable listing.
2. **A request does not hold dates.** Neither does an approved request that has not been paid.
3. **A submitted payment does hold dates**, for a limited time. This refines the Owner's original instruction ("leave dates open until payment is confirmed") and was agreed in the review: a GCash/BPI guest who has paid and tapped "I Paid" must not lose the dates to someone else while the payment waits to be verified. That would recreate the booking #140 situation (DEC-022) with a manual refund on top.
4. **Approve first, then send a payment link.** No card authorisation at request time (§5).
5. Approval is permission to pay, not a guarantee of the dates. Guest wording must say dates are first come, first served until payment.
6. Retrofitting permission checks onto the existing admin routes (Next #17) is **not a blocker now**. It becomes one before any manager account is given admin access. New routes built here use `checkPermission` from the start.

## 3. Lifecycle

`Booking.status` is a plain string column (not an enum), so new states need no column change. One table is kept: guest messages, additional charges, scheduled messages, checkout attempts and the admin screens all hang off `Booking`.

| Status | Meaning | Holds dates |
|---|---|---|
| `requested` | Guest asked; waiting for the Owner | No |
| `approved` | Owner said yes; waiting for payment via the link | No |
| `pending` | GCash/BPI payment submitted; waiting for the Owner to verify it | **Yes**, until the hold expires |
| `confirmed` | Paid and verified | Yes |
| `declined` | Owner said no | No |
| `expired` | Request or payment link timed out | No |
| `cancelled` | Cancelled (existing) | No |

Consequences that make this safe:

- `pending` keeps exactly its current meaning, so **existing pending bookings need no migration**.
- `BLOCKING_BOOKING_STATUSES` in `src/lib/booking-status.ts` stays `["pending", "confirmed"]`. It is an allowlist, so the new statuses are non-blocking by default, and the iCal export and sibling propagation follow automatically.
- DEC-002 is amended, not reversed: record a new decision at implementation.

Transitions:

- Instant path (On, or a trusted guest in Auto): unchanged from today. Card goes straight to `confirmed`; GCash/BPI goes to `pending`.
- Approval path: `requested` → `approved` → (`pending` for GCash/BPI →) `confirmed`.
- Exits: `requested` → `declined` or `expired`; `approved` → `expired` or `cancelled`; `pending` → `cancelled` or hold expiry.

Every move from a non-holding status to a holding one takes the inventory lock and re-checks availability (`withInventoryLock`, DEC-024). The admin status route already does this for cancelled → active; generalise that check, which is written against `bookingBlocksAvailability`.

## 4. Approval path, step by step

1. Guest fills in the booking form. The policy layer (`src/lib/booking-policy.ts`, built in Step 1) returns `requires_approval`.
2. Guest submits. No payment screen. A `Booking` is saved as `requested` with the server quote. Guest and Owner get "request received" emails. The price is honoured until the request or its payment link expires.
3. Owner approves or declines in admin. Approval re-checks availability first and refuses if the dates are gone.
4. On approval the booking becomes `approved`, gets an unguessable payment token and an expiry, and the guest is emailed a payment link.
5. Guest opens the link. The page re-checks availability, then offers GCash, BPI or card for the stored amount.
6. GCash/BPI: guest pays and taps "I Paid". Under the inventory lock the booking moves to `pending` and now holds the dates. Owner verifies and confirms as today.
7. Card: the PaymentIntent is created for the stored amount with the booking id in its metadata. After verification (DEC-020), under the lock, the booking moves to `confirmed`.
8. If the dates were taken between approval and payment, the guest sees that before paying. If a card payment loses the race after charging, the existing paid-but-unavailable handling applies (`src/lib/paid-unavailable.ts`, DEC-024 policy 5).
9. A scheduled job expires stale `requested` and `approved` bookings and tells the guest. Use Vercel Cron (DEC-022).

### Correct, then approve (Owner-approved 2026-10-09)

A request sometimes does not match what the guest agreed with the Owner beforehand, for example fewer guests declared than discussed. The Owner talks to guests on Messenger, checks there, and then needs to fix the request without making the guest start again.

- On a `requested` booking the Owner can change guests, dates or listing before approving.
- The stay is re-quoted on the server and the stored total is **replaced**. This is safe here because no money has moved. It differs from DEC-024, which preserves the price of a booking that has already been agreed or paid.
- Approval then proceeds as in step 3, with the same availability re-check. The approval email states the corrected details and total, so the guest sees what they are paying for.
- The correction and the approval are each written to `AdminLog` with before and after values.
- **Gotcha:** `classifyStayPhase` in `src/lib/booking-amendment.ts:100` treats any non-holding status as "cancelled", which is not editable. `requested` and `approved` must get their own phase.

For a booking that is already `pending` or `confirmed` (the guest has paid the lower amount), the remedy is the separate brief [Correct and Charge the Difference](HIL_FEAT_Correct_And_Charge_Difference.md).

## 5. Why a payment link, not authorise-and-capture

The first draft suggested placing a hold on the guest's card when they request, and capturing it on approval. That is rejected because:

- It works only for cards. GCash and BPI have no equivalent, so there would be two different approval flows.
- It ties up a guest's money for a request that may be declined, and card holds lapse after a few days.
- The current payment code charges immediately and verifies a `succeeded` payment; hold-then-capture would change that verification for all card bookings.

With a link, nothing is charged until the Owner has approved and the dates are still free, and all three methods follow the same steps. The pattern already exists: additional charges are paid through `/pay/[token]` (`src/app/pay/[token]/page.tsx`, `src/app/api/charges/[token]/pay/route.ts`). Build the booking payment page on the same components. The cost is that the guest must return for a second step, which is why the link expires.

## 6. Data changes (to finalise in session 1)

- `Property.instantBookingMode String @default("on")` — `off`, `on`, `auto`.
- `Booking`: payment token (unique, nullable), request expiry, payment-link expiry, hold expiry, approved/declined timestamp, deciding admin, decision note.
- Add the unique constraint on `Booking.stripePaymentIntentId` in the same migration (the open follow-up from DEC-020).
- Additive migration, operator-applied before merge (DEC-026).

## 7. Status audit (required task)

About 30 comparisons against status literals exist across about 20 files. Each must be checked so an unpaid request is never treated as a real booking. Known cases:

- `src/lib/emailReply.ts:74` and `src/app/api/sms/inbound/route.ts:129` match any booking that is not cancelled.
- `src/app/admin/calendar/CalendarClient.tsx:516` counts non-cancelled bookings.
- `src/lib/customers.ts` sums `grossSpent` over all statuses.
- `src/components/admin/BookingStatusSelect.tsx` and `src/app/api/admin/bookings/[id]/route.ts` list and accept statuses.
- `src/lib/scheduler.ts` and `src/lib/checkout-abandonment.ts` key on booking state.

Also:

- GA4 `booking_confirmed` must not fire for a request. Add a separate `booking_request` event that is not a key event.
- Scheduled guest messages are created only on `confirmed`, as today.
- A request never reaches the payment screen, so it creates no `CheckoutAttempt`; the payment-link page does.

## 8. Emails

Distinct messages for: request received, approved with payment link (states that dates are not yet held), declined, expired, payment received and being verified, confirmed, and paid but unavailable. Wording follows the content rules in `SEO-DEC-013`–`018`.

## 9. Sessions

| Session | Deliverable |
|---|---|
| 1 | Final transition table and data model; status audit; Owner sign-off on §11. No production change |
| 2 | Migration; mode setting in admin; request creation; approve/decline with re-check; correct-then-approve; expiry job; tests |
| 3 | Guest request flow; payment-link page for all three methods; hold on "I Paid"; emails; GA4 event |
| 4 | Concurrency and sibling-inventory tests; acceptance on `dev.haveninlipa.com`; release and production verification; layered docs and new decision entry |

## 10. Acceptance criteria

1. On behaves exactly as the site does today. Off requires approval for every guest.
2. A `requested` or `approved` booking never blocks the calendar, sibling listings or the Airbnb export.
3. A `pending` or `confirmed` booking blocks exactly as today.
4. Two guests racing for the same nights produce at most one holding booking.
5. Approval is refused when the dates are no longer free.
6. No card is charged before approval, and none is charged when the dates are already gone at the time the link is opened.
7. Existing `pending` bookings are untouched by the release.
8. Every approve, decline and status change is in `AdminLog`, and the new admin routes enforce `checkPermission`.
9. Emails, scheduled messages, abandonment alerts and GA4 distinguish a request from a confirmed booking.
10. Card and GCash/BPI paths are each tested end to end on the dev database, never with a real guest.
11. The Owner can correct guests, dates or listing on a request before approving; the payment link carries the re-quoted total and the approval email shows the corrected details.

## 11. Open Owner decisions

1. How long a request waits for approval before expiring, and how long a payment link stays valid. Same-day stays likely need shorter windows.
2. How long a submitted GCash/BPI payment holds dates, and what happens at expiry. Recommendation: alert the Owner at expiry and release only on the Owner's action or a longer hard limit, because the guest may genuinely have paid.
3. Whether the Owner may confirm a booking without payment (for a friend, say). The first draft assumed no.
4. Whether a guest may submit a request when Step 1's same-day cutoff has passed.
5. Who issues a GCash/BPI refund when a payment arrives for dates already taken, and how the case is tracked.

## 12. Kickoff checklist

1. Step 1 is live, since this step extends its policy function.
2. Read `docs/HIL_PROJECT_STATUS.md`, `docs/HIL_DECISIONS.md` (DEC-002, DEC-020, DEC-022, DEC-024, DEC-026) and `docs/HIL_MIGRATION_RUNBOOK.md`.
3. Re-verify the file references; the code may have moved since `977c8fa`.
4. Confirm Owner authorization and the answers to §11.
5. Ship behind the per-listing setting with every listing left on On, so the release changes nothing until the Owner switches a listing.
