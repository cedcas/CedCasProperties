# HIL Feature Brief — Instant Booking Modes & Request Lifecycle

**Status:** Design direction approved by the Owner 2026-10-09. **Started 2026-10-12 (Owner go-ahead); Session 1 in progress** — design only, no code, migration or deploy yet. Session 1 results are in §13; the Owner answered §11 the same day. **Live on production since 2026-10-13 (PR #78, merge `206dbde`; DEC-028); migration on dev and production; all 5 listings On.** Sessions 1 to 3 built 2026-10-12; Session 4 release and docs done. **Remaining: the Owner's acceptance test** (§10), which the merge preceded. Do not switch a production listing to Off before it passes. Auto arrives with Step 3. Departures from the text below are recorded in §13.4.
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

## 11. Owner decisions (answered 2026-10-12)

1. **Time limits.** A request expires 24 hours after it is sent. A payment link expires 24 hours after approval. Both end earlier if the listing's booking deadline for the check-in date (Step 1 advance notice and same-day cutoff) comes first.
2. **Payment hold.** Alert only. A GCash/BPI booking still `pending` 24 hours after "I Paid" sends the Owner one alert. Dates stay held until the Owner confirms or cancels; nothing is released automatically. This applies to both paths, so instant GCash/BPI bookings behave as today plus the alert.
3. **Confirm without payment.** No. An approved request becomes `confirmed` only through its payment link.
4. **Late requests.** No. Step 1's advance-notice rules apply to a request exactly as to a booking.
5. **GCash/BPI refund for dates already taken.** The Owner refunds by hand, as in DEC-024 policy 5: the site refuses the booking, tells the guest, writes an `AdminLog` entry and sends one admin alert. No refund flag in admin and no deadline promised to the guest.

## 12. Kickoff checklist

1. Step 1 is live, since this step extends its policy function.
2. Read `docs/HIL_PROJECT_STATUS.md`, `docs/HIL_DECISIONS.md` (DEC-002, DEC-020, DEC-022, DEC-024, DEC-026) and `docs/HIL_MIGRATION_RUNBOOK.md`.
3. Re-verify the file references; the code may have moved since `977c8fa`.
4. Confirm Owner authorization and the answers to §11.
5. Ship behind the per-listing setting with every listing left on On, so the release changes nothing until the Owner switches a listing.

## 13. Session 1 results (2026-10-12, against `main` `904a116`)

Step 1 is live (DEC-027), so kickoff item 1 is met. Every file reference in this brief was re-checked and still holds, including the line numbers in §4 and §7.

### 13.1 Status audit

Statuses are compared as string literals in 14 files. Safe by construction, because they use the `BLOCKING_BOOKING_STATUSES` allowlist: `src/lib/availability.ts`, `src/lib/inventory-groups.ts`, `src/app/api/calendar/[slug]/route.ts`. The scheduler (`src/lib/scheduler.ts`) acts only on `confirmed`, and `customers.ts` `totalSpent` and `scripts/reconcile-ga4-bookings.ts` count only `confirmed`. None of these need a change.

Must change:

| Where | Today | Needed |
|---|---|---|
| `src/app/api/admin/bookings/[id]/route.ts` PUT | Writes any string sent as `status`, unvalidated. Locks and re-checks on any non-holding → holding move | Accept only a listed set of transitions. `requested`/`approved`/`declined`/`expired` are set only by the new routes. The existing lock already covers `approved` → `pending`/`confirmed` |
| `src/components/admin/BookingStatusSelect.tsx` | Offers pending / confirmed / cancelled for every booking | Show Approve / Decline for a request; offer only the valid next statuses otherwise |
| `src/lib/booking-amendment.ts:100` | Non-holding = "cancelled", not editable | New `request` phase: guests, dates and listing editable, total re-quoted (§4) |
| `src/app/admin/calendar/CalendarClient.tsx:279, 299, 516` | Any non-cancelled booking is drawn as occupying nights, counted, and can mark an Airbnb event as "covered" | Use `bookingBlocksAvailability`; show requests separately as non-blocking |
| `src/lib/emailReply.ts:74`, `src/app/api/sms/inbound/route.ts:129` | Thread a reply to the newest non-cancelled booking | Keep `requested`/`approved` (the guest is replying to a request email); exclude `declined`/`expired` like `cancelled`. STOP opt-out keeps covering all |
| `src/lib/customers.ts` | `grossSpent` and `bookingCount` include every status | Exclude `requested`/`approved`/`declined`/`expired` |
| `src/app/admin/dashboard/page.tsx`, status badges on 3 admin pages | Count pending / confirmed; any other status renders amber like pending | Add a "requests waiting" count; distinct badge colours |
| `src/lib/checkout-abandonment.ts:158` | Any booking for the same guest, listing and check-in marks an attempt complete | Ignore `declined`/`expired` rows |
| `src/app/api/bookings/route.ts`, `/api/stripe/payment-intent`, `/api/checkout-attempts` | No approval concept | On an Off listing all three must return or act on `requires_approval`, so a direct API call cannot pay instantly. A payment intent for an approved booking is created only through its payment token |
| `src/components/booking/BookingForm.tsx:531` | Fires `booking_confirmed` and `purchase` on every submission | Fire `booking_request` for a request; the payment-link page fires the other two |

Not in the brief until now:

- **`pending` has no expiry today.** §3 says it holds "until the hold expires". Settled by §11 answer 2: there is no automatic release. Read "hold expiry" in §2, §3 and §6 as the time the Owner is alerted.
- **Card fee.** A request has no payment method, and the 6% card fee depends on it. Store the request's total without the fee; the payment page adds the fee if the guest picks card, as `AdditionalCharge` does.
- **Promo codes.** `usageCount` is incremented at booking creation. For a request, increment it when the booking first reaches `pending` or `confirmed`, so declined and expired requests do not use up a code.

### 13.2 Proposed final data model

One additive migration, operator-applied before merge (DEC-026).

- `Property.instantBookingMode String @default("on")` — `off` | `on` | `auto`.
- `Booking.paymentToken String? @unique`
- `Booking.requestExpiresAt DateTime?`, `paymentLinkExpiresAt DateTime?`
- `Booking.paymentSubmittedAt DateTime?` (set at "I Paid"), `holdAlertedAt DateTime?` (set when the 24-hour alert is sent, so it is sent once). These replace the hold-expiry field in §6
- `Booking.decidedAt DateTime?`, `decidedById Int?` (AdminUser, set null on delete), `decisionNote String? @db.Text`
- `Booking.stripePaymentIntentId` gains `@unique` (DEC-020 follow-up). Before migrating, the operator checks both databases for duplicate values; nulls are allowed to repeat.
- `@@index([status])` on `Booking` for the expiry job.

`Booking.status` stays a string, default `pending`. No existing row is rewritten.

### 13.3 Final transition table

| From | To | Triggered by | Lock + availability re-check |
|---|---|---|---|
| (new) | `confirmed` / `pending` | Guest, instant path (unchanged) | Yes |
| (new) | `requested` | Guest, approval path | No (advance notice and capacity still checked) |
| `requested` | `approved` | Admin approve route | Check, no hold |
| `requested` | `declined` | Admin decline route | No |
| `requested` | `expired` | Expiry job | No |
| `approved` | `pending` | Guest, "I Paid" on the payment link (GCash/BPI) | Yes |
| `approved` | `confirmed` | Guest, verified card payment on the link | Yes |
| `approved` | `expired` / `cancelled` | Expiry job / admin | No |
| `approved` | `confirmed` by an admin | Not allowed (§11 answer 3) | — |
| `pending` | `confirmed` / `cancelled` | Admin (unchanged) | No (already holding) |
| `cancelled` | `pending` / `confirmed` | Admin (unchanged, DEC-024) | Yes |

`declined` and `expired` are final. A guest who still wants the stay submits a new request.

### 13.4 Departures from this brief, found while building (2026-10-12)

- **No `CheckoutAttempt` on the payment-link page** (§7 said it creates one). The abandonment job treats any booking for the same guest, listing and check-in as a completed checkout, and here that booking already exists (`approved`), so an attempt could never raise an alert. The Owner already knows who the guest is, and the expiry email covers an unpaid link.
- **A verified card payment is honoured slightly past the link's expiry**, as long as the request is still `approved` and the dates are free. The card intent is refused strictly once the link has expired, so this only covers a guest who opened the card form in time and paid a moment late. Refusing would leave a charged card with no booking.
- **Listing switched while a guest is paying.** On → Off: a verified card payment, or a GCash/BPI guest who reached the payment screen in the last 2 hours, is still taken as an instant booking. Off → On: a request sent from a stale form is refused (`instant_booking`) and the form moves the guest to payment.
- **GCash/BPI lost race** (§11 answer 5): `AdminLog` target `booking-payment-unavailable-<id>`, one alert per request however often the guest taps. The request stays `approved` until its link expires.

